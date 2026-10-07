// Settlement calculation utilities for FairShare.
// Balances are computed in integer cents; amounts are returned as numbers in
// the group's currency units.

import { fromCents, toCents } from "./money";

export interface UserBalance {
  userId: string;
  name: string;
  email: string;
  totalPaid: number;
  totalOwed: number;
  /** Net of recorded settlement payments (sent minus received). */
  settledNet: number;
  netBalance: number; // positive = is owed money, negative = owes money
}

export interface Settlement {
  id?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

export interface GroupSettlements {
  groupId: string;
  currency: string;
  balances: UserBalance[];
  suggestedSettlements: Settlement[];
  totalTransactions: number;
}

export interface BalanceUser {
  id: string;
  name: string | null;
  email: string | null;
  displayName?: string | null;
}

export interface BalanceMember {
  user: BalanceUser;
}

export interface BalanceExpense {
  payers: Array<{ userId: string; amountPaid: number }>;
  splits: Array<{ userId: string; amount: number }>;
  /** Itemized expenses carry their splits on the items instead. */
  items?: Array<{ splits: Array<{ userId: string; amount: number }> }>;
}

export interface RecordedPayment {
  payerId: string; // who handed over the money (the debtor)
  payeeId: string; // who received it (the creditor)
  amount: number;
}

function displayName(user: BalanceUser) {
  return user.name || user.displayName || user.email || "Unknown";
}

/**
 * Calculate balances for everyone in a group. Users who appear in expenses or
 * payments but are no longer listed as members are still included, so money
 * never silently drops out of the books.
 */
export function calculateGroupBalances(
  members: BalanceMember[],
  expenses: BalanceExpense[],
  payments: RecordedPayment[] = [],
  extraUsers: BalanceUser[] = []
): UserBalance[] {
  const known = new Map<string, BalanceUser>();
  extraUsers.forEach((u) => known.set(u.id, u));
  members.forEach((m) => known.set(m.user.id, m.user));

  const map = new Map<string, { paid: number; owed: number; settled: number }>();
  const get = (userId: string) => {
    let b = map.get(userId);
    if (!b) {
      b = { paid: 0, owed: 0, settled: 0 };
      map.set(userId, b);
    }
    return b;
  };

  members.forEach((m) => get(m.user.id));

  for (const expense of expenses) {
    for (const payer of expense.payers) get(payer.userId).paid += toCents(Number(payer.amountPaid));
    for (const split of expense.splits) get(split.userId).owed += toCents(Number(split.amount));
    for (const item of expense.items ?? []) {
      for (const split of item.splits) get(split.userId).owed += toCents(Number(split.amount));
    }
  }

  for (const p of payments) {
    const cents = toCents(Number(p.amount));
    get(p.payerId).settled += cents;
    get(p.payeeId).settled -= cents;
  }

  return Array.from(map.entries()).map(([userId, b]) => {
    const u = known.get(userId);
    return {
      userId,
      name: u ? displayName(u) : "Former member",
      email: u?.email || "",
      totalPaid: fromCents(b.paid),
      totalOwed: fromCents(b.owed),
      settledNet: fromCents(b.settled),
      netBalance: fromCents(b.paid - b.owed + b.settled),
    };
  });
}

/**
 * Suggest payments that clear every balance with few transactions
 * (greedy: largest debtor pays largest creditor). Works in cents, so the
 * suggestions always clear the balances exactly.
 */
export function optimizeSettlements(balances: UserBalance[], currency: string = "USD"): Settlement[] {
  const creditors = balances
    .map((b) => ({ ...b, cents: toCents(b.netBalance) }))
    .filter((b) => b.cents > 0)
    .sort((a, b) => b.cents - a.cents || a.userId.localeCompare(b.userId));
  const debtors = balances
    .map((b) => ({ ...b, cents: -toCents(b.netBalance) }))
    .filter((b) => b.cents > 0)
    .sort((a, b) => b.cents - a.cents || a.userId.localeCompare(b.userId));

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.cents, debtor.cents);
    settlements.push({
      fromUserId: debtor.userId,
      fromUserName: debtor.name,
      toUserId: creditor.userId,
      toUserName: creditor.name,
      amount: fromCents(amount),
      currency,
    });
    creditor.cents -= amount;
    debtor.cents -= amount;
    if (creditor.cents === 0) i++;
    if (debtor.cents === 0) j++;
  }
  return settlements;
}

/**
 * Calculate complete group settlement information
 */
export function calculateGroupSettlements(
  groupId: string,
  currency: string,
  members: BalanceMember[],
  expenses: BalanceExpense[],
  payments: RecordedPayment[] = [],
  extraUsers: BalanceUser[] = []
): GroupSettlements {
  const balances = calculateGroupBalances(members, expenses, payments, extraUsers);
  const suggestedSettlements = optimizeSettlements(balances, currency);

  return {
    groupId,
    currency,
    balances,
    suggestedSettlements,
    totalTransactions: suggestedSettlements.length,
  };
}

/**
 * Format currency amount for display
 */
export function formatSettlementAmount(amount: number, currency: string): string {
  // Fixed 2 decimals: amounts are stored in cents for every currency, and a
  // fixed format renders identically on the server and in the browser.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get settlement summary text
 */
export function getSettlementSummary(settlements: Settlement[]): string {
  if (settlements.length === 0) {
    return "All settled up! 🎉";
  }
  
  if (settlements.length === 1) {
    return "1 payment needed to settle up";
  }
  
  return `${settlements.length} payments needed to settle up`;
}

/**
 * Check if user is involved in any settlements
 */
export function getUserSettlements(
  settlements: Settlement[],
  userId: string
): { owes: Settlement[]; owed: Settlement[] } {
  const owes = settlements.filter(s => s.fromUserId === userId);
  const owed = settlements.filter(s => s.toUserId === userId);
  
  return { owes, owed };
}
