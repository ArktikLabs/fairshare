// Pure expense maths shared by create and edit: turn a validated payload
// (with every person already resolved to a user id) into the rows we store,
// and summarise / diff expenses for the activity log. All money in cents.

import { assertPayersMatchTotal, calculateSplit, toCents, type SplitInput, type SplitMethodName } from "./money";

export interface ResolvedPayer {
  userId: string;
  amountPaid: number;
  paymentMethod?: string;
  paymentRef?: string;
}

export interface ResolvedItem {
  name: string;
  description?: string;
  amount: number;
  quantity: number;
  unitPrice?: number;
  category?: string;
  isShared: boolean;
  splitMethod: SplitMethodName;
  participants: SplitInput[];
}

export interface ResolvedExpenseInput {
  amount: number;
  payers: ResolvedPayer[];
  /** Simple expenses */
  splitMethod?: SplitMethodName;
  participants?: SplitInput[];
  /** Itemized expenses */
  items?: ResolvedItem[];
}

export interface ComputedRows {
  splitMethod: SplitMethodName;
  payers: ResolvedPayer[];
  splits: Array<SplitInput & { amount: number }>;
  items: Array<Omit<ResolvedItem, "participants"> & { splits: Array<SplitInput & { amount: number }> }>;
}

/**
 * Validate and compute every row of an expense. Throws an Error with a
 * user-facing message when the numbers do not add up. Used for both create
 * and edit, so an edit recomputes splits exactly like a fresh expense.
 */
export function computeExpenseRows(input: ResolvedExpenseInput): ComputedRows {
  if (!(input.amount > 0)) throw new Error("Amount must be greater than 0");
  if (input.payers.length === 0) throw new Error("At least one payer is required");
  assertPayersMatchTotal(input.amount, input.payers.map((p) => p.amountPaid));
  if (new Set(input.payers.map((p) => p.userId)).size !== input.payers.length) {
    throw new Error("Each payer can only appear once");
  }

  if (input.items && input.items.length > 0) {
    const itemCents = input.items.reduce((sum, item) => sum + toCents(item.amount), 0);
    if (itemCents !== toCents(input.amount)) throw new Error("Sum of item amounts must equal expense total");
    return {
      splitMethod: "EQUAL",
      payers: input.payers,
      splits: [],
      items: input.items.map(({ participants, ...item }) => ({
        ...item,
        splits: calculateSplit(item.amount, participants, item.splitMethod),
      })),
    };
  }

  if (!input.participants || !input.splitMethod) throw new Error("Pick who the expense is split between");
  return {
    splitMethod: input.splitMethod,
    payers: input.payers,
    splits: calculateSplit(input.amount, input.participants, input.splitMethod),
    items: [],
  };
}

// ----- summaries for the activity log -----

export interface ExpenseSummary {
  description: string;
  /** cents */
  amount: number;
  category: string | null;
  /** YYYY-MM-DD */
  date: string;
  notes: string | null;
  itemized: boolean;
  splitMethod: string;
  /** userId -> cents paid */
  payers: Record<string, number>;
  /** userId -> cents owed (item splits folded in) */
  shares: Record<string, number>;
  /** item name + cents, in order */
  items: Array<{ name: string; amount: number }>;
  receipt: boolean;
}

interface SummaryInput {
  description: string;
  amount: number | { toString(): string };
  category: string | null;
  date: Date | string;
  notes: string | null;
  splitMethod: string;
  receiptKey?: string | null;
  payers: Array<{ userId: string; amountPaid: number | { toString(): string } }>;
  splits: Array<{ userId: string; amount: number | { toString(): string } }>;
  items: Array<{ name: string; amount: number | { toString(): string }; splits: Array<{ userId: string; amount: number | { toString(): string } }> }>;
}

const c = (v: number | { toString(): string }) => toCents(Number(v));

/**
 * The calendar day an expense date stands for. Dates picked in the form are
 * stored as UTC midnight; older rows (or API calls without a date) carry a
 * real timestamp, which is read in the server's time zone like formatDate().
 * The edit form, the detail page and the edit diff all use this, so opening
 * and saving an expense never shifts or "changes" its date.
 */
export function calendarDay(d: Date): string {
  const utcMidnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  if (utcMidnight) return d.toISOString().slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function summarizeExpense(e: SummaryInput): ExpenseSummary {
  const payers: Record<string, number> = {};
  e.payers.forEach((p) => (payers[p.userId] = (payers[p.userId] ?? 0) + c(p.amountPaid)));
  const shares: Record<string, number> = {};
  e.splits.forEach((s) => (shares[s.userId] = (shares[s.userId] ?? 0) + c(s.amount)));
  e.items.forEach((i) => i.splits.forEach((s) => (shares[s.userId] = (shares[s.userId] ?? 0) + c(s.amount))));
  const d = typeof e.date === "string" ? new Date(e.date) : e.date;
  return {
    description: e.description,
    amount: c(e.amount),
    category: e.category,
    date: calendarDay(d),
    notes: e.notes || null,
    itemized: e.items.length > 0,
    splitMethod: e.items.length > 0 ? "ITEMIZED" : e.splitMethod,
    payers,
    shares,
    items: e.items.map((i) => ({ name: i.name, amount: c(i.amount) })),
    receipt: Boolean(e.receiptKey),
  };
}

/** Net effect per person in cents: paid minus share (positive = lent). */
export function expenseImpact(s: Pick<ExpenseSummary, "payers" | "shares">): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(s.payers)) out[id] = (out[id] ?? 0) + v;
  for (const [id, v] of Object.entries(s.shares)) out[id] = (out[id] ?? 0) - v;
  return out;
}

export type ExpenseChange =
  | { field: "description"; from: string; to: string }
  | { field: "amount"; from: number; to: number }
  | { field: "date"; from: string; to: string }
  | { field: "category"; from: string | null; to: string | null }
  | { field: "notes" }
  | { field: "payers" }
  | { field: "split" }
  | { field: "items" }
  | { field: "receipt"; to: boolean };

const sameMap = (a: Record<string, number>, b: Record<string, number>) => {
  const ka = Object.keys(a).filter((k) => a[k] !== 0);
  const kb = Object.keys(b).filter((k) => b[k] !== 0);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

/** What changed between two versions of an expense, in a fixed order. */
export function diffExpense(before: ExpenseSummary, after: ExpenseSummary): ExpenseChange[] {
  const out: ExpenseChange[] = [];
  if (before.description !== after.description) out.push({ field: "description", from: before.description, to: after.description });
  if (before.amount !== after.amount) out.push({ field: "amount", from: before.amount, to: after.amount });
  if (before.date !== after.date) out.push({ field: "date", from: before.date, to: after.date });
  if (before.category !== after.category) out.push({ field: "category", from: before.category, to: after.category });
  if ((before.notes ?? "") !== (after.notes ?? "")) out.push({ field: "notes" });
  // One payer who paid the whole amount both times: an amount change is not a payer change
  const soleSamePayer =
    Object.keys(before.payers).length === 1 &&
    Object.keys(after.payers).join() === Object.keys(before.payers).join();
  if (!sameMap(before.payers, after.payers) && !soleSamePayer) out.push({ field: "payers" });
  const itemsChanged =
    before.itemized !== after.itemized ||
    before.items.length !== after.items.length ||
    before.items.some((it, i) => it.name !== after.items[i].name || it.amount !== after.items[i].amount);
  if (after.itemized && itemsChanged) out.push({ field: "items" });
  if (!sameMap(before.shares, after.shares) || before.splitMethod !== after.splitMethod) {
    // An amount change always moves the shares; only call out the split when
    // it changed beyond that (different people, method or proportions).
    const scaledOnly =
      before.amount !== after.amount &&
      before.splitMethod === after.splitMethod &&
      before.splitMethod === "EQUAL" &&
      Object.keys(before.shares).sort().join() === Object.keys(after.shares).sort().join();
    if (!scaledOnly && !(after.itemized && itemsChanged)) out.push({ field: "split" });
  }
  if (before.receipt !== after.receipt) out.push({ field: "receipt", to: after.receipt });
  return out;
}
