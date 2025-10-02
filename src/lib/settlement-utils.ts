// Settlement calculation utilities for FairShare

export interface UserBalance {
  userId: string;
  name: string;
  email: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive = owed money, negative = owes money
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

/**
 * Calculate balances for all users in a group
 */
export function calculateGroupBalances(
  members: Array<{ user: { id: string; name: string | null; email: string | null } }>,
  expenses: Array<{
    amount: number;
    payers: Array<{ userId: string; amountPaid: number }>;
    splits: Array<{ userId: string; amount: number }>;
  }>
): UserBalance[] {
  const balanceMap = new Map<string, UserBalance>();

  // Initialize all members with zero balances
  members.forEach(member => {
    balanceMap.set(member.user.id, {
      userId: member.user.id,
      name: member.user.name || member.user.email || "Unknown",
      email: member.user.email || "",
      totalPaid: 0,
      totalOwed: 0,
      netBalance: 0,
    });
  });

  // Calculate totals from expenses
  expenses.forEach(expense => {
    // Add amounts paid by each user
    expense.payers.forEach(payer => {
      const balance = balanceMap.get(payer.userId);
      if (balance) {
        balance.totalPaid += Number(payer.amountPaid);
      }
    });

    // Add amounts owed by each user
    expense.splits.forEach(split => {
      const balance = balanceMap.get(split.userId);
      if (balance) {
        balance.totalOwed += Number(split.amount);
      }
    });
  });

  // Calculate net balances
  balanceMap.forEach(balance => {
    balance.netBalance = balance.totalPaid - balance.totalOwed;
  });

  return Array.from(balanceMap.values());
}

/**
 * Optimize settlements to minimize the number of transactions
 * Uses a greedy algorithm to match largest creditors with largest debtors
 */
export function optimizeSettlements(
  balances: UserBalance[],
  currency: string = "USD"
): Settlement[] {
  // Create working copies and filter out zero balances
  const creditors = balances
    .filter(b => b.netBalance > 0.01)
    .map(b => ({ ...b }))
    .sort((a, b) => b.netBalance - a.netBalance); // Largest first

  const debtors = balances
    .filter(b => b.netBalance < -0.01)
    .map(b => ({ ...b, netBalance: Math.abs(b.netBalance) }))
    .sort((a, b) => b.netBalance - a.netBalance); // Largest debt first

  const settlements: Settlement[] = [];

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    // Calculate settlement amount (minimum of what's owed and what's due)
    const amount = Math.min(creditor.netBalance, debtor.netBalance);

    if (amount > 0.01) { // Only create settlements for meaningful amounts
      settlements.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.name,
        toUserId: creditor.userId,
        toUserName: creditor.name,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
        currency,
      });
    }

    // Update balances
    creditor.netBalance -= amount;
    debtor.netBalance -= amount;

    // Move to next creditor/debtor if balance is settled
    if (creditor.netBalance < 0.01) i++;
    if (debtor.netBalance < 0.01) j++;
  }

  return settlements;
}

/**
 * Calculate complete group settlement information
 */
export function calculateGroupSettlements(
  groupId: string,
  currency: string,
  members: Array<{ user: { id: string; name: string | null; email: string | null } }>,
  expenses: Array<{
    amount: number;
    payers: Array<{ userId: string; amountPaid: number }>;
    splits: Array<{ userId: string; amount: number }>;
  }>
): GroupSettlements {
  const balances = calculateGroupBalances(members, expenses);
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
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
