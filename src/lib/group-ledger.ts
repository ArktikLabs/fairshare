// Loads everything needed to compute a group's balances from the database.
// Used by the settlements API, the group page and the cross-group overview so
// they all show the same numbers.

import { prisma } from "./prisma";
import { calculateGroupSettlements, type GroupSettlements } from "./settlement-utils";

export async function loadGroupSettlements(groupId: string): Promise<GroupSettlements | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId, isActive: true },
    include: {
      members: {
        where: { status: { in: ["ACTIVE", "INVITED"] } },
        include: { user: { select: { id: true, name: true, email: true, displayName: true } } },
      },
      expenses: {
        where: { isDeleted: false },
        include: {
          payers: { select: { userId: true, amountPaid: true } },
          splits: { select: { userId: true, amount: true } },
          items: { include: { splits: { select: { userId: true, amount: true } } } },
        },
      },
      settlements: {
        where: { status: "CONFIRMED" },
        select: { payerId: true, payeeId: true, amount: true },
      },
    },
  });
  if (!group) return null;

  const expenses = group.expenses.map((e) => ({
    payers: e.payers.map((p) => ({ userId: p.userId, amountPaid: Number(p.amountPaid) })),
    splits: e.splits.map((s) => ({ userId: s.userId, amount: Number(s.amount) })),
    items: e.items.map((i) => ({
      splits: i.splits.map((s) => ({ userId: s.userId, amount: Number(s.amount) })),
    })),
  }));
  const payments = group.settlements.map((s) => ({
    payerId: s.payerId,
    payeeId: s.payeeId,
    amount: Number(s.amount),
  }));

  // Names for people who left the group but still have money on the books
  const memberIds = new Set(group.members.map((m) => m.userId));
  const otherIds = new Set<string>();
  for (const e of expenses) {
    e.payers.forEach((p) => otherIds.add(p.userId));
    e.splits.forEach((s) => otherIds.add(s.userId));
    e.items.forEach((i) => i.splits.forEach((s) => otherIds.add(s.userId)));
  }
  payments.forEach((p) => {
    otherIds.add(p.payerId);
    otherIds.add(p.payeeId);
  });
  memberIds.forEach((id) => otherIds.delete(id));
  const extraUsers = otherIds.size
    ? await prisma.user.findMany({
        where: { id: { in: [...otherIds] } },
        select: { id: true, name: true, email: true, displayName: true },
      })
    : [];

  return calculateGroupSettlements(
    group.id,
    group.currency,
    group.members,
    expenses,
    payments,
    extraUsers
  );
}

export async function isActiveMember(groupId: string, userId: string) {
  const m = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: "ACTIVE", group: { isActive: true } },
    select: { id: true, role: true },
  });
  return m;
}


export interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  description: string | null;
  createdAt: string;
  createdBy: string | null;
  from: { id: string; name: string };
  to: { id: string; name: string };
}

/** Confirmed payments in a group, newest first. */
export async function loadPaymentHistory(groupId: string, take = 50): Promise<PaymentRecord[]> {
  const history = await prisma.settlement.findMany({
    where: { groupId, status: "CONFIRMED" },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      payer: { select: { id: true, name: true, email: true, displayName: true } },
      payee: { select: { id: true, name: true, email: true, displayName: true } },
    },
  });
  return history.map((s) => ({
    id: s.id,
    amount: Number(s.amount),
    method: s.method,
    description: s.description,
    createdAt: s.createdAt.toISOString(),
    createdBy: s.createdBy,
    from: { id: s.payer.id, name: s.payer.name || s.payer.displayName || s.payer.email },
    to: { id: s.payee.id, name: s.payee.name || s.payee.displayName || s.payee.email },
  }));
}
