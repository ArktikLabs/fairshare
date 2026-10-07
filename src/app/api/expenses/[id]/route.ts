import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_VALUES } from "@/lib/categories";
import { computeExpenseRows, diffExpense, expenseImpact, summarizeExpense } from "@/lib/expense-compute";
import {
  HttpError,
  clearExpenseRows,
  errorJson,
  loadExpenseFor,
  parseExpenseBody,
  parseExpenseDate,
  resolveExpenseInput,
  writeExpenseRows,
} from "@/lib/expense-write";
import { recordActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

const fail = (error: unknown, what: string) => {
  const { body, status } = errorJson(error);
  if (status >= 500) console.error(what, error);
  return NextResponse.json(body, { status });
};

const ARCHIVED = "This group is archived. Unarchive it in group settings to make changes.";

// Description / category / notes / date only (older clients)
const MetaSchema = z.object({
  description: z.string().trim().min(1).max(255).optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  notes: z.string().max(1000).optional().nullable(),
  date: z.string().optional(),
});

// GET /api/expenses/[id] - Expense with people, items and permissions
export async function GET(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { expense, canManage, archived } = await loadExpenseFor(id, session.user.id, { includeDeleted: true });
    if (expense.isDeleted && !canManage) throw new HttpError(404, "Expense not found");
    const { receiptKey, ...rest } = expense;
    return NextResponse.json({
      ...rest,
      hasReceipt: Boolean(receiptKey),
      receiptUrl: receiptKey ? `/api/expenses/${expense.id}/receipt` : null,
      canEdit: canManage,
      archived,
    });
  } catch (error) {
    return fail(error, "Error fetching expense:");
  }
}

// PUT /api/expenses/[id] - Edit an expense. A full body (same shape as
// create: amount, payers, participants or items) replaces payers, splits and
// items in one transaction; a body without payers only edits the details.
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;
    const { expense, canManage, archived } = await loadExpenseFor(id, userId);
    if (archived) throw new HttpError(409, ARCHIVED);
    if (!canManage) {
      throw new HttpError(403, "Only the person who added the expense, a payer or a group admin can edit it");
    }

    const before = summarizeExpense(expense);
    const raw = await request.json();
    const full = typeof raw === "object" && raw !== null && "payers" in raw;

    // Resolve and compute outside the transaction (resolving can invite
    // placeholder users); nothing is written if the numbers do not add up.
    let rows: ReturnType<typeof computeExpenseRows> | null = null;
    let data: ReturnType<typeof parseExpenseBody>["data"] | null = null;
    let meta: z.infer<typeof MetaSchema> | null = null;
    if (full) {
      const parsed = parseExpenseBody(raw);
      data = parsed.data;
      if (data.groupId && data.groupId !== expense.groupId) {
        throw new HttpError(400, "An expense cannot move to another group");
      }
      // People already on the expense stay allowed, even if they have left since
      const alreadyOn = new Set([
        ...expense.payers.map((p) => p.userId),
        ...expense.splits.map((s) => s.userId),
        ...expense.items.flatMap((i) => i.splits.map((s) => s.userId)),
      ]);
      const resolved = await resolveExpenseInput(data, parsed.itemized, userId, expense.groupId, alreadyOn);
      rows = computeExpenseRows(resolved);
    } else {
      meta = MetaSchema.parse(raw);
    }

    await prisma.$transaction(async (tx) => {
      if (rows && data) {
        await clearExpenseRows(tx, id);
        await tx.expense.update({
          where: { id },
          data: {
            amount: new Decimal(data.amount),
            description: data.description,
            date: data.date ? parseExpenseDate(data.date) : undefined,
            category: data.category,
            notes: data.notes === undefined ? undefined : data.notes || null,
            splitMethod: rows.splitMethod,
            updatedById: userId,
          },
        });
        await writeExpenseRows(tx, id, rows);
      } else if (meta) {
        await tx.expense.update({
          where: { id },
          data: {
            description: meta.description,
            category: meta.category,
            notes: meta.notes === undefined ? undefined : meta.notes || null,
            date: meta.date ? parseExpenseDate(meta.date) : undefined,
            updatedById: userId,
          },
        });
      }

      const after = summarizeExpense(
        await tx.expense.findUniqueOrThrow({
          where: { id },
          include: { payers: true, splits: true, items: { include: { splits: true } } },
        })
      );
      const changes = diffExpense(before, after);
      if (changes.length > 0) {
        await recordActivity(
          {
            type: "EXPENSE_UPDATED",
            actorId: userId,
            groupId: expense.groupId,
            expenseId: id,
            payload: { description: after.description, amount: after.amount, impact: expenseImpact(after), changes },
          },
          tx
        );
      }
    });

    const updated = await prisma.expense.findUniqueOrThrow({ where: { id }, select: { id: true, amount: true, description: true } });
    return NextResponse.json({ id: updated.id, amount: Number(updated.amount), description: updated.description });
  } catch (error) {
    return fail(error, "Error updating expense:");
  }
}

// DELETE /api/expenses/[id] - Soft delete (restorable from the expense page or activity feed)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;
    const { expense, canManage, archived } = await loadExpenseFor(id, userId);
    if (archived) throw new HttpError(409, ARCHIVED);
    if (!canManage) {
      throw new HttpError(403, "Only the person who added the expense, a payer or a group admin can delete it");
    }
    const summary = summarizeExpense(expense);
    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), deletedById: userId },
      });
      await recordActivity(
        {
          type: "EXPENSE_DELETED",
          actorId: userId,
          groupId: expense.groupId,
          expenseId: id,
          payload: { description: summary.description, amount: summary.amount, impact: expenseImpact(summary) },
        },
        tx
      );
    });
    return NextResponse.json({ message: "Expense deleted", restorable: true });
  } catch (error) {
    return fail(error, "Error deleting expense:");
  }
}
