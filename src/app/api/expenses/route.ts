import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";
import { expenseListInclude, involvedWhere, serializeExpense } from "@/lib/expense-serialize";
import { isCategory } from "@/lib/categories";
import { calendarDay, expenseImpact, summarizeExpense } from "@/lib/expense-compute";
import {
  HttpError,
  errorJson,
  parseExpenseBody,
  parseExpenseDate,
  requireWritableMembership,
  resolveExpenseInput,
  writeExpenseRows,
} from "@/lib/expense-write";
import { recordActivity } from "@/lib/activity";
import { fxPayload, parseExtras, prepareExpense, repeatFrequency } from "@/lib/expense-prepare";
import { syncRecurring } from "@/lib/recurring";

// POST /api/expenses - Create expense (simple or itemized)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const raw = await request.json();
    const { data, itemized } = parseExpenseBody(raw);
    const extras = parseExtras(raw);
    const group = data.groupId
      ? (await requireWritableMembership(data.groupId, userId), await prisma.group.findUniqueOrThrow({ where: { id: data.groupId }, select: { currency: true } }))
      : null;
    const frequency = repeatFrequency(extras);
    if (frequency && !data.groupId) throw new HttpError(400, "Repeating expenses need a group");
    if (extras.currency && !group) throw new HttpError(400, "Expenses in another currency need a group");

    // Resolve people before the transaction (may invite placeholder users),
    // then compute every row up front so a validation error never leaves
    // half an expense behind.
    const resolved = await resolveExpenseInput(data, itemized, userId, data.groupId);
    const date = parseExpenseDate(data.date);
    const day = calendarDay(date);
    const prepared = await prepareExpense(resolved, group?.currency ?? "USD", extras, day);
    const rows = prepared.rows;

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          amount: new Decimal(prepared.amount),
          ...prepared.fx,
          description: data.description,
          date,
          category: data.category,
          groupId: data.groupId,
          splitMethod: rows.splitMethod,
          notes: data.notes || null,
          createdById: userId,
          updatedById: userId,
        },
      });
      await writeExpenseRows(tx, expense.id, rows);
      const full = await tx.expense.findUniqueOrThrow({
        where: { id: expense.id },
        include: { payers: true, splits: true, items: { include: { splits: true } } },
      });
      const summary = summarizeExpense(full);
      await recordActivity(
        {
          type: "EXPENSE_CREATED",
          actorId: userId,
          groupId: expense.groupId,
          expenseId: expense.id,
          payload: { description: summary.description, amount: summary.amount, impact: expenseImpact(summary), ...fxPayload(prepared.fx) },
        },
        tx
      );
      if (frequency && expense.groupId) {
        await syncRecurring(tx, {
          expenseId: expense.id,
          groupId: expense.groupId,
          ownerId: userId,
          day,
          amountCents: summary.amount,
          template: {
            input: resolved,
            description: data.description,
            category: data.category ?? null,
            notes: data.notes || null,
            currency: prepared.fx.originalCurrency,
            manualRate: prepared.fx.rateSource === "manual" && prepared.fx.exchangeRate ? Number(prepared.fx.exchangeRate) : null,
          },
          frequency,
          endDate: extras.repeat?.endDate ?? null,
        });
      }
      return expense;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const { body, status } = errorJson(error);
    if (status >= 500) console.error("Error creating expense:", error);
    return NextResponse.json(body, { status });
  }
}

// GET /api/expenses - Expenses visible to the user, newest first.
// Filters: groupId, category, from, to (YYYY-MM-DD, inclusive), q (search).
// Without `limit` the full list is returned as an array (legacy shape). With
// `limit` (1-100) the response is { items, nextCursor } and `cursor` pages on.
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const url = new URL(request.url);
    const groupId = url.searchParams.get("groupId");
    const category = url.searchParams.get("category");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const q = url.searchParams.get("q")?.trim();
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : null;

    const and: Prisma.ExpenseWhereInput[] = [{ isDeleted: false }];

    if (groupId) {
      // Group members see every expense of the group, not only their own
      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId, status: "ACTIVE", group: { isActive: true } },
        select: { id: true },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "Access denied: Not a member of this group" },
          { status: 403 }
        );
      }
      and.push({ groupId });
    } else {
      // Everything in groups I am active in, plus personal expenses I am on
      const active = await prisma.groupMember.findMany({
        where: { userId, status: "ACTIVE", group: { isActive: true } },
        select: { groupId: true },
      });
      and.push({
        OR: [
          { groupId: { in: active.map((m) => m.groupId) } },
          { groupId: null, ...involvedWhere(userId) },
        ],
      });
    }

    if (category) {
      if (!isCategory(category)) {
        return NextResponse.json({ error: "Unknown category" }, { status: 400 });
      }
      and.push({ category });
    }

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && !dateRe.test(from)) || (to && !dateRe.test(to))) {
      return NextResponse.json({ error: "Dates must be YYYY-MM-DD" }, { status: 400 });
    }
    if (from || to) {
      // Expense dates are stored as UTC midnight of the chosen calendar day
      const range: Prisma.DateTimeFilter = {};
      if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) range.lt = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000);
      and.push({ date: range });
    }

    if (q) {
      and.push({
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { group: { name: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    const expenses = await prisma.expense.findMany({
      where: { AND: and },
      include: expenseListInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      ...(limit
        ? { take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) }
        : {}),
    });

    const adminGroups = new Set(
      (
        await prisma.groupMember.findMany({
          where: { userId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
          select: { groupId: true },
        })
      ).map((m) => m.groupId)
    );

    if (!limit) {
      return NextResponse.json(expenses.map((e) => serializeExpense(e, userId, adminGroups)));
    }
    const page = expenses.slice(0, limit);
    return NextResponse.json({
      items: page.map((e) => serializeExpense(e, userId, adminGroups)),
      nextCursor: expenses.length > limit ? page[page.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
