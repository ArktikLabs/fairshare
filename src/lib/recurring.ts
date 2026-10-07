// Recurring expenses: a template (RecurringExpense) holds the resolved
// expense body; the cron job creates each due occurrence as a normal expense
// (same payers / split, recomputed in cents), recorded in activity as created
// by the template owner. Occurrences are unique per (template, date), so a
// cron run that repeats or overlaps never creates duplicates.

import { Prisma, type ExpenseCategory } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./prisma";
import { recordActivity } from "./activity";
import { expenseImpact, summarizeExpense, type ResolvedExpenseInput } from "./expense-compute";
import { writeExpenseRows } from "./expense-write";
import { prepareExpense, type RecurringTemplate } from "./expense-prepare";
import { getRate } from "./fx-rates";
import { dateToDay, dayToDate, dueOccurrences, nextOccurrence, occurrenceDate, todayIn, type Frequency } from "./recurrence";

type Tx = Prisma.TransactionClient;

/** Everyone a template's expense involves. */
export function templatePeople(input: ResolvedExpenseInput): string[] {
  return [
    ...new Set([
      ...input.payers.map((p) => p.userId),
      ...(input.participants ?? []).map((p) => p.userId),
      ...(input.items ?? []).flatMap((i) => i.participants.map((p) => p.userId)),
    ]),
  ];
}

/**
 * Create, update or stop the template for an expense after a create/edit.
 * `frequency` undefined = leave the template alone (only refresh its body).
 */
export async function syncRecurring(
  tx: Tx,
  opts: {
    expenseId: string;
    groupId: string;
    ownerId: string;
    day: string;
    amountCents: number;
    template: RecurringTemplate;
    frequency: Frequency | null | undefined;
    endDate: string | null | undefined;
  }
) {
  const expense = await tx.expense.findUnique({ where: { id: opts.expenseId }, select: { recurringId: true } });
  const existing =
    (await tx.recurringExpense.findFirst({ where: { sourceExpenseId: opts.expenseId, status: { not: "STOPPED" } } })) ??
    (expense?.recurringId
      ? await tx.recurringExpense.findFirst({ where: { id: expense.recurringId, status: { not: "STOPPED" } } })
      : null);
  const body = {
    template: opts.template as unknown as Prisma.InputJsonValue,
    description: opts.template.description,
    amount: opts.amountCents,
  };

  if (!existing) {
    if (!opts.frequency) return null;
    const next = nextOccurrence(opts.day, opts.frequency, 1, opts.endDate);
    return tx.recurringExpense.create({
      data: {
        groupId: opts.groupId,
        ownerId: opts.ownerId,
        frequency: opts.frequency,
        startDate: dayToDate(opts.day),
        endDate: opts.endDate ? dayToDate(opts.endDate) : null,
        count: 1,
        nextDate: dayToDate(next ?? opts.day),
        status: next ? "ACTIVE" : "STOPPED",
        sourceExpenseId: opts.expenseId,
        ...body,
      },
    });
  }

  if (opts.frequency === null) {
    return tx.recurringExpense.update({ where: { id: existing.id }, data: { status: "STOPPED" } });
  }
  const freq = opts.frequency ?? existing.frequency;
  const endDate = opts.endDate === undefined ? existing.endDate : opts.endDate ? dayToDate(opts.endDate) : null;
  let { startDate, count } = existing;
  if (freq !== existing.frequency) {
    // Restart the schedule from the latest occurrence with the new rhythm
    startDate = dayToDate(occurrenceDate(dateToDay(existing.startDate), existing.frequency, existing.count - 1));
    count = 1;
  }
  const next = nextOccurrence(dateToDay(startDate), freq, count, endDate ? dateToDay(endDate) : null);
  return tx.recurringExpense.update({
    where: { id: existing.id },
    data: {
      ...body,
      frequency: freq,
      startDate,
      count,
      endDate,
      nextDate: next ? dayToDate(next) : existing.nextDate,
      status: next ? (existing.status === "PAUSED" ? "PAUSED" : "ACTIVE") : "STOPPED",
      lastError: null,
    },
  });
}

export interface RecurringRunResult {
  created: number;
  skipped: number;
  errors: string[];
}

/** Create every due occurrence. `now` can be faked by the cron test hook. */
export async function runRecurring(now: Date = new Date()): Promise<RecurringRunResult> {
  const result: RecurringRunResult = { created: 0, skipped: 0, errors: [] };
  // Widest possible "today" (UTC+14) for the first filter; exact per owner below
  const horizon = new Date(now.getTime() + 14 * 3600_000);
  const due = await prisma.recurringExpense.findMany({
    where: { status: "ACTIVE", nextDate: { lte: horizon } },
    include: {
      owner: { select: { id: true, preferences: { select: { timezone: true } } } },
      group: { select: { id: true, currency: true, isActive: true, archivedAt: true } },
    },
    take: 200,
  });

  for (const t of due) {
    const today = todayIn(t.owner.preferences?.timezone, now);
    const start = dateToDay(t.startDate);
    const end = t.endDate ? dateToDay(t.endDate) : null;
    const occurrences = dueOccurrences(start, t.frequency, t.count, today, end);
    if (occurrences.length === 0) continue;

    const problem = await blocker(t.groupId, t.ownerId, t.group, t.template as unknown as RecurringTemplate);
    if (problem) {
      await prisma.recurringExpense.update({ where: { id: t.id }, data: { status: "PAUSED", lastError: problem } });
      result.errors.push(`${t.id}: ${problem}`);
      continue;
    }

    const tpl = t.template as unknown as RecurringTemplate;
    for (const occ of occurrences) {
      try {
        const created = await createOccurrence(t.id, t.groupId, t.ownerId, t.group.currency, tpl, occ.day);
        if (created) result.created++;
        else result.skipped++;
        const next = nextOccurrence(start, t.frequency, occ.index + 1, end);
        await prisma.recurringExpense.update({
          where: { id: t.id },
          data: {
            count: occ.index + 1,
            nextDate: next ? dayToDate(next) : dayToDate(occ.day),
            status: next ? "ACTIVE" : "STOPPED",
            lastError: null,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await prisma.recurringExpense.update({ where: { id: t.id }, data: { lastError: msg.slice(0, 300) } });
        result.errors.push(`${t.id}: ${msg}`);
        break;
      }
    }
  }
  return result;
}

async function blocker(
  groupId: string,
  ownerId: string,
  group: { isActive: boolean; archivedAt: Date | null },
  tpl: RecurringTemplate
): Promise<string | null> {
  if (!group.isActive) return "The group was deleted";
  if (group.archivedAt) return "The group is archived";
  const people = [ownerId, ...templatePeople(tpl.input)];
  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: people }, status: { in: ["ACTIVE", "INVITED"] } },
    select: { userId: true, status: true },
  });
  const ok = new Set(members.map((m) => m.userId));
  if (!members.some((m) => m.userId === ownerId && m.status === "ACTIVE")) return "The person who set it up left the group";
  if (people.some((p) => !ok.has(p))) return "Someone on this expense left the group";
  return null;
}

/** One occurrence; returns false when it already exists. */
async function createOccurrence(
  recurringId: string,
  groupId: string,
  ownerId: string,
  groupCurrency: string,
  tpl: RecurringTemplate,
  day: string
): Promise<boolean> {
  const exists = await prisma.expense.findUnique({
    where: { recurringId_recurrenceDate: { recurringId, recurrenceDate: dayToDate(day) } },
    select: { id: true },
  });
  if (exists) return false;
  // Today's rate when available; the template's manual rate otherwise
  const lookup: typeof getRate = async (b, q, d) => (await getRate(b, q, d)) ?? (tpl.manualRate ? { rate: tpl.manualRate, day: d, source: "manual" } : null);
  const prepared = await prepareExpense(tpl.input, groupCurrency, { currency: tpl.currency, exchangeRate: null }, day, lookup);
  try {
    await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          amount: new Decimal(prepared.amount),
          description: tpl.description,
          date: dayToDate(day),
          category: tpl.category as ExpenseCategory | null,
          groupId,
          splitMethod: prepared.rows.splitMethod,
          notes: tpl.notes,
          createdById: ownerId,
          updatedById: ownerId,
          recurringId,
          recurrenceDate: dayToDate(day),
          ...prepared.fx,
        },
      });
      await writeExpenseRows(tx, expense.id, prepared.rows);
      const full = await tx.expense.findUniqueOrThrow({
        where: { id: expense.id },
        include: { payers: true, splits: true, items: { include: { splits: true } } },
      });
      const summary = summarizeExpense(full);
      await recordActivity(
        {
          type: "EXPENSE_CREATED",
          actorId: ownerId,
          groupId,
          expenseId: expense.id,
          payload: {
            description: summary.description,
            amount: summary.amount,
            impact: expenseImpact(summary),
            recurring: true,
            ...(prepared.fx.originalCurrency
              ? { originalCurrency: prepared.fx.originalCurrency, originalAmount: Math.round(Number(prepared.fx.originalAmount) * 100) }
              : {}),
          },
        },
        tx
      );
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
  return true;
}

export interface RecurringView {
  id: string;
  description: string;
  amount: number;
  frequency: Frequency;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  nextDate: string;
  endDate: string | null;
  count: number;
  lastError: string | null;
  ownerId: string;
  ownerName: string;
  sourceExpenseId: string | null;
}

export async function listRecurring(where: Prisma.RecurringExpenseWhereInput): Promise<RecurringView[]> {
  const rows = await prisma.recurringExpense.findMany({
    where,
    include: { owner: { select: { name: true, displayName: true, email: true } } },
    orderBy: [{ status: "asc" }, { nextDate: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    frequency: r.frequency,
    status: r.status,
    nextDate: dateToDay(r.nextDate),
    endDate: r.endDate ? dateToDay(r.endDate) : null,
    count: r.count,
    lastError: r.lastError,
    ownerId: r.ownerId,
    ownerName: r.owner.name || r.owner.displayName || r.owner.email,
    sourceExpenseId: r.sourceExpenseId,
  }));
}
