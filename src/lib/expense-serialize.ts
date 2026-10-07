// Plain-number view of an expense for the UI, shared by the expenses API and
// server-rendered pages. Item splits are folded into `splits` per person, and
// `my` holds the current user's paid / share / net.

import type { Prisma } from "@prisma/client";
import { toCents } from "./money";
import { canManageExpense } from "./permissions";

const userSelect = { select: { id: true, name: true, email: true, displayName: true } } as const;

export const expenseListInclude = {
  payers: { include: { user: userSelect } },
  splits: { include: { user: userSelect } },
  items: { include: { splits: { include: { user: userSelect } } } },
  group: {
    select: {
      id: true,
      name: true,
      currency: true,
      archivedAt: true,
      kind: true,
      // Direct (1:1) groups are shown by the other person's name
      members: { where: { status: "ACTIVE" }, take: 2, select: { user: userSelect } },
    },
  },
  _count: { select: { comments: true } },
} satisfies Prisma.ExpenseInclude;

export type ListedExpense = Prisma.ExpenseGetPayload<{ include: typeof expenseListInclude }>;
type ListedUser = ListedExpense["payers"][number]["user"];

export interface ExpenseUser {
  id: string;
  name: string | null;
  email: string;
}

export interface SerializedExpense {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  date: string;
  notes: string | null;
  groupId: string | null;
  group: { id: string; name: string; currency: string; href: string } | null;
  isItemized: boolean;
  payers: Array<{ userId: string; user: ExpenseUser; amount: number }>;
  splits: Array<{ userId: string; user: ExpenseUser; amount: number }>;
  items: Array<{
    id: string;
    name: string;
    amount: number;
    splits: Array<{ userId: string; user: ExpenseUser; amount: number }>;
  }>;
  my: { paid: number; share: number; net: number };
  canEdit: boolean;
  hasReceipt: boolean;
  commentCount: number;
}

type NamedUser = { id: string; name: string | null; displayName: string | null; email: string };

/** "With Budi" for a 1:1 group, from the viewer's side. */
export function directLabel(members: NamedUser[], viewerId: string): string {
  const other = members.find((m) => m.id !== viewerId);
  return other ? `With ${other.name || other.displayName || other.email}` : "Direct";
}

export function friendHref(members: Array<{ id: string }>, viewerId: string): string {
  const other = members.find((m) => m.id !== viewerId);
  return other ? `/friends/${other.id}` : "/friends";
}

const plainUser = (u: ListedUser): ExpenseUser => ({
  id: u.id,
  name: u.name || u.displayName || null,
  email: u.email,
});

export function serializeExpense(
  e: ListedExpense,
  userId: string,
  adminGroups: Set<string>
): SerializedExpense {
  const shares = new Map<string, { user: ListedUser; cents: number }>();
  const addShare = (user: ListedUser, amount: Prisma.Decimal) => {
    const cur = shares.get(user.id) ?? { user, cents: 0 };
    cur.cents += toCents(Number(amount));
    shares.set(user.id, cur);
  };
  e.splits.forEach((s) => addShare(s.user, s.amount));
  e.items.forEach((i) => i.splits.forEach((s) => addShare(s.user, s.amount)));

  const paidCents = e.payers
    .filter((p) => p.userId === userId)
    .reduce((sum, p) => sum + toCents(Number(p.amountPaid)), 0);
  const shareCents = shares.get(userId)?.cents ?? 0;

  return {
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    category: e.category,
    date: e.date.toISOString(),
    notes: e.notes,
    groupId: e.groupId,
    group: e.group
      ? {
          id: e.group.id,
          name: e.group.kind === "DIRECT" ? directLabel(e.group.members.map((m) => m.user), userId) : e.group.name,
          currency: e.group.currency,
          href: e.group.kind === "DIRECT" ? friendHref(e.group.members.map((m) => m.user), userId) : `/groups/${e.group.id}`,
        }
      : null,
    isItemized: e.items.length > 0,
    payers: e.payers.map((p) => ({ userId: p.userId, user: plainUser(p.user), amount: Number(p.amountPaid) })),
    splits: [...shares.values()].map((s) => ({ userId: s.user.id, user: plainUser(s.user), amount: s.cents / 100 })),
    items: e.items.map((i) => ({
      id: i.id,
      name: i.name,
      amount: Number(i.amount),
      splits: i.splits.map((s) => ({ userId: s.userId, user: plainUser(s.user), amount: Number(s.amount) })),
    })),
    my: { paid: paidCents / 100, share: shareCents / 100, net: (paidCents - shareCents) / 100 },
    canEdit: canManageExpense({
      userId,
      createdById: e.createdById,
      payerIds: e.payers.map((p) => p.userId),
      role: e.groupId && adminGroups.has(e.groupId) ? "ADMIN" : null,
      archived: Boolean(e.group?.archivedAt),
    }),
    hasReceipt: Boolean(e.receiptKey),
    commentCount: e._count.comments,
  };
}

/** Where-clause for expenses the user can see (groups they are active in, or involved personally). */
export function involvedWhere(userId: string): Prisma.ExpenseWhereInput {
  return {
    OR: [
      { payers: { some: { userId } } },
      { splits: { some: { userId } } },
      { items: { some: { splits: { some: { userId } } } } },
    ],
  };
}
