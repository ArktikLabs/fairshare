// The signed-in user's position across all their groups, computed from the
// same group ledger as the group page and the settlements API. Used by the
// dashboard, the groups list, the settle-up page and /api/balances, so every
// screen shows the same numbers.

import { prisma } from "./prisma";
import { loadGroupSettlements } from "./group-ledger";
import { fromCents, toCents } from "./money";
import type { Settlement } from "./settlement-utils";

export interface CurrencyTotals {
  owe: number;
  owed: number;
  net: number;
}

export interface GroupPosition {
  id: string;
  name: string;
  currency: string;
  myStatus: "ACTIVE" | "INVITED";
  memberCount: number;
  invitedCount: number;
  expenseCount: number;
  /** Positive = you are owed, negative = you owe. 0 for pending invites. */
  net: number;
  owes: Settlement[];
  owed: Settlement[];
}

export interface UserOverview {
  groups: GroupPosition[];
  totals: Record<string, CurrencyTotals>;
}

/** Add one group's net to per-currency totals (in cents, no float drift). */
export function addToTotals(totals: Record<string, CurrencyTotals>, currency: string, net: number) {
  const t = (totals[currency] ??= { owe: 0, owed: 0, net: 0 });
  const c = toCents(net);
  t.owe = fromCents(toCents(t.owe) + Math.max(0, -c));
  t.owed = fromCents(toCents(t.owed) + Math.max(0, c));
  t.net = fromCents(toCents(t.net) + c);
}

export async function loadUserOverview(userId: string): Promise<UserOverview> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, status: { in: ["ACTIVE", "INVITED"] }, group: { isActive: true } },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          currency: true,
          members: { where: { status: { in: ["ACTIVE", "INVITED"] } }, select: { status: true } },
          _count: { select: { expenses: { where: { isDeleted: false } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const groups: GroupPosition[] = [];
  const totals: Record<string, CurrencyTotals> = {};

  for (const m of memberships) {
    const g = m.group;
    const base = {
      id: g.id,
      name: g.name,
      currency: g.currency,
      myStatus: m.status as "ACTIVE" | "INVITED",
      memberCount: g.members.filter((x) => x.status === "ACTIVE").length,
      invitedCount: g.members.filter((x) => x.status === "INVITED").length,
      expenseCount: g._count.expenses,
    };
    if (m.status !== "ACTIVE") {
      groups.push({ ...base, net: 0, owes: [], owed: [] });
      continue;
    }
    const ledger = await loadGroupSettlements(g.id);
    const net = ledger?.balances.find((b) => b.userId === userId)?.netBalance ?? 0;
    const owes = ledger?.suggestedSettlements.filter((s) => s.fromUserId === userId) ?? [];
    const owed = ledger?.suggestedSettlements.filter((s) => s.toUserId === userId) ?? [];
    addToTotals(totals, g.currency, net);
    groups.push({ ...base, net, owes, owed });
  }

  return { groups, totals };
}
