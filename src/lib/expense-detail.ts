// Everything the expense detail and edit pages need, from one access check.

import { prisma } from "./prisma";
import { loadExpenseFor } from "./expense-write";
import { listComments, type CommentRow } from "./comments";
import type { ActivityPayload, ActivityTypeName } from "./activity-format";
import { toCents } from "./money";
import type { StoredExpenseForForm, StoredSplit } from "./split-form";
import { withinRestoreWindow } from "./permissions";
import { calendarDay } from "./expense-compute";
import { allocateInUnits } from "./money";
import { minorUnitCents } from "./currencies";
import { listRecurring, type RecurringView } from "./recurring";

export interface DetailPerson {
  id: string;
  name: string;
  email: string;
}

export interface ExpenseDetail {
  id: string;
  description: string;
  /** cents */
  amount: number;
  currency: string;
  category: string | null;
  date: string;
  notes: string | null;
  group: { id: string; name: string; href: string } | null;
  splitMethod: string;
  itemized: boolean;
  payers: Array<{ person: DetailPerson; cents: number }>;
  /** Item splits folded in */
  shares: Array<{ person: DetailPerson; cents: number; percentage: number | null; shares: number | null }>;
  items: Array<{ id: string; name: string; cents: number; splitMethod: string; splits: Array<{ person: DetailPerson; cents: number }> }>;
  my: { paid: number; share: number };
  createdAt: string;
  createdBy: DetailPerson | null;
  updatedAt: string;
  updatedBy: DetailPerson | null;
  deleted: { at: string | null; by: DetailPerson | null; restorable: boolean } | null;
  hasReceipt: boolean;
  /** Paid in another currency */
  fx: { originalCents: number; originalCurrency: string; rate: number; rateDate: string | null; source: string | null } | null;
  recurring: RecurringView | null;
  canManage: boolean;
  archived: boolean;
  comments: CommentRow[];
  history: Array<{
    id: string;
    type: ActivityTypeName;
    actorId: string;
    groupId: string | null;
    expenseId: string | null;
    settlementId: string | null;
    targetUserId: string | null;
    payload: ActivityPayload;
    createdAt: string;
  }>;
  /** For the edit form */
  stored: StoredExpenseForForm;
}

export async function loadExpenseDetail(id: string, userId: string): Promise<ExpenseDetail | null> {
  let ctx;
  try {
    ctx = await loadExpenseFor(id, userId, { includeDeleted: true });
  } catch {
    return null;
  }
  const { expense: e, canManage, archived } = ctx;
  if (e.isDeleted && !canManage) return null;

  const ids = new Set<string>();
  e.payers.forEach((p) => ids.add(p.userId));
  e.splits.forEach((s) => ids.add(s.userId));
  e.items.forEach((i) => i.splits.forEach((s) => ids.add(s.userId)));
  [e.createdById, e.updatedById, e.deletedById].forEach((x) => x && ids.add(x));
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, name: true, displayName: true, email: true },
  });
  const people = new Map<string, DetailPerson>(
    users.map((u) => [u.id, { id: u.id, name: u.name || u.displayName || u.email, email: u.email }])
  );
  const person = (pid: string | null) => (pid ? people.get(pid) ?? { id: pid, name: "Former member", email: "" } : null);

  const shareMap = new Map<string, { cents: number; percentage: number | null; shares: number | null }>();
  e.splits.forEach((s) =>
    shareMap.set(s.userId, {
      cents: toCents(Number(s.amount)),
      percentage: s.percentage === null ? null : Number(s.percentage),
      shares: s.shares,
    })
  );
  e.items.forEach((i) =>
    i.splits.forEach((s) => {
      const cur = shareMap.get(s.userId) ?? { cents: 0, percentage: null, shares: null };
      cur.cents += toCents(Number(s.amount));
      shareMap.set(s.userId, cur);
    })
  );

  const recurringList = await listRecurring({
    OR: [{ sourceExpenseId: id }, ...(e.recurringId ? [{ id: e.recurringId }] : [])],
    status: { not: "STOPPED" },
  });
  const [comments, history] = await Promise.all([
    listComments(id),
    prisma.activity.findMany({
      where: { expenseId: id, type: { in: ["EXPENSE_CREATED", "EXPENSE_UPDATED", "EXPENSE_DELETED", "EXPENSE_RESTORED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  type SplitRow = { userId: string; amount: unknown; percentage: unknown; shares: number | null };
  const stored = (splits: SplitRow[]): StoredSplit[] =>
    splits.map((s) => ({
      userId: s.userId,
      amount: toCents(Number(s.amount)),
      percentage: s.percentage === null ? null : Number(s.percentage),
      shares: s.shares,
    }));

  // Foreign-currency expenses open in the edit form in their own currency:
  // stored group-currency rows are scaled back onto the original total
  // (exact for even splits, proportional otherwise).
  const fxCur = e.originalCurrency && e.originalAmount && e.exchangeRate ? e.originalCurrency : null;
  const origTotal = fxCur ? toCents(Number(e.originalAmount)) : 0;
  const back = <T extends { amount: number }>(rows: T[], total = origTotal): T[] => {
    if (!fxCur || rows.length === 0) return rows;
    const parts = allocateInUnits(total, rows.map((r) => r.amount), minorUnitCents(fxCur));
    return rows.map((r, i) => ({ ...r, amount: parts[i] }));
  };

  const myPaid = e.payers.filter((p) => p.userId === userId).reduce((s, p) => s + toCents(Number(p.amountPaid)), 0);

  return {
    id: e.id,
    description: e.description,
    amount: toCents(Number(e.amount)),
    currency: e.group?.currency ?? "USD",
    category: e.category,
    date: e.date.toISOString(),
    notes: e.notes,
    group: e.group
      ? e.group.kind === "DIRECT"
        ? (() => {
            const other = [...people.values()].find((p) => p.id !== userId && (e.payers.some((x) => x.userId === p.id) || shareMap.has(p.id)));
            return { id: e.group.id, name: other ? `With ${other.name}` : "Direct", href: other ? `/friends/${other.id}` : "/friends" };
          })()
        : { id: e.group.id, name: e.group.name, href: `/groups/${e.group.id}` }
      : null,
    splitMethod: e.items.length ? "ITEMIZED" : e.splitMethod,
    itemized: e.items.length > 0,
    payers: e.payers.map((p) => ({ person: person(p.userId)!, cents: toCents(Number(p.amountPaid)) })),
    shares: [...shareMap].map(([pid, v]) => ({ person: person(pid)!, ...v })),
    items: e.items.map((i) => ({
      id: i.id,
      name: i.name,
      cents: toCents(Number(i.amount)),
      splitMethod: i.splitMethod,
      splits: i.splits.map((s) => ({ person: person(s.userId)!, cents: toCents(Number(s.amount)) })),
    })),
    my: { paid: myPaid, share: shareMap.get(userId)?.cents ?? 0 },
    createdAt: e.createdAt.toISOString(),
    createdBy: person(e.createdById),
    updatedAt: e.updatedAt.toISOString(),
    updatedBy: person(e.updatedById),
    deleted: e.isDeleted
      ? { at: e.deletedAt?.toISOString() ?? null, by: person(e.deletedById), restorable: withinRestoreWindow(e.deletedAt) && !archived }
      : null,
    hasReceipt: Boolean(e.receiptKey),
    fx: fxCur
      ? {
          originalCents: origTotal,
          originalCurrency: fxCur,
          rate: Number(e.exchangeRate),
          rateDate: e.rateDate ? e.rateDate.toISOString().slice(0, 10) : null,
          source: e.rateSource,
        }
      : null,
    recurring: recurringList[0] ?? null,
    canManage,
    archived,
    comments,
    history: history.map((h) => ({
      id: h.id,
      type: h.type,
      actorId: h.actorId,
      groupId: h.groupId,
      expenseId: h.expenseId,
      settlementId: h.settlementId,
      targetUserId: h.targetUserId,
      payload: (h.payload ?? {}) as ActivityPayload,
      createdAt: h.createdAt.toISOString(),
    })),
    stored: (() => {
      const items = back(e.items.map((i) => ({ name: i.name, amount: toCents(Number(i.amount)), splitMethod: i.splitMethod, splits: stored(i.splits) })));
      return {
        description: e.description,
        amount: fxCur ? origTotal : toCents(Number(e.amount)),
        date: calendarDay(e.date),
        category: e.category,
        notes: e.notes,
        splitMethod: e.splitMethod,
        payers: back(e.payers.map((p) => ({ userId: p.userId, amount: toCents(Number(p.amountPaid)) }))),
        splits: back(stored(e.splits)),
        items: items.map((it) => ({ ...it, splits: back(it.splits, it.amount) })),
        currency: fxCur,
        exchangeRate: fxCur ? Number(e.exchangeRate) : null,
        repeat: recurringList[0] && recurringList[0].sourceExpenseId === e.id
          ? { frequency: recurringList[0].frequency, endDate: recurringList[0].endDate }
          : null,
      };
    })(),
  };
}
