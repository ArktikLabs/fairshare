// Friends and 1:1 expenses. Each pair of friends shares a hidden DIRECT
// group (kind = DIRECT, one per pair via directKey), so expenses, settle-up,
// activity and notifications reuse the group machinery. Direct groups are
// left out of group lists; /friends shows them per person, with the net
// balance across the direct group and every group the two share.

import { prisma } from "./prisma";
import { createOrGetGhostUser } from "./ghost-users";
import { loadGroupSettlements } from "./group-ledger";
import { recordActivity } from "./activity";
import { toCents } from "./money";

export const directKey = (a: string, b: string) => [a, b].sort().join(":");

/** Find or create the hidden 1:1 group for two users (both ACTIVE members). */
export async function ensureDirectGroup(userId: string, friendId: string, currency: string) {
  if (userId === friendId) throw new Error("You cannot add yourself as a friend");
  const key = directKey(userId, friendId);
  const existing = await prisma.group.findUnique({ where: { directKey: key } });
  if (existing) {
    if (!existing.isActive) await prisma.group.update({ where: { id: existing.id }, data: { isActive: true } });
    return { group: existing, created: false };
  }
  try {
    const group = await prisma.group.create({
      data: {
        name: "Direct",
        kind: "DIRECT",
        directKey: key,
        currency,
        createdBy: userId,
        simplifyDebts: false,
        members: {
          create: [
            { userId, role: "OWNER", status: "ACTIVE", joinedAt: new Date() },
            { userId: friendId, role: "OWNER", status: "ACTIVE", joinedAt: new Date(), invitedBy: userId },
          ],
        },
      },
    });
    return { group, created: true };
  } catch (e) {
    // Two requests raced on the unique directKey
    const again = await prisma.group.findUnique({ where: { directKey: key } });
    if (again) return { group: again, created: false };
    throw e;
  }
}

export async function addFriendByEmail(userId: string, rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, preferences: { select: { currency: true } } },
  });
  if (!me) throw new Error("Not signed in");
  if (me.email.toLowerCase() === email) throw new Error("That is your own email");
  const friend = await createOrGetGhostUser(email, userId);
  const { group, created } = await ensureDirectGroup(userId, friend.id, me.preferences?.currency || "USD");
  if (created) {
    await recordActivity({
      type: "FRIEND_ADDED",
      actorId: userId,
      groupId: group.id,
      targetUserId: friend.id,
      payload: { targetName: friend.name || friend.displayName || friend.email },
    });
  }
  return { friend, group, created };
}

export interface FriendBalance {
  currency: string;
  /** + = they owe you, - = you owe them (units) */
  net: number;
}

export interface FriendRow {
  id: string;
  name: string;
  email: string;
  isGhost: boolean;
  directGroupId: string | null;
  /** Per currency, across the direct group and shared groups */
  balances: FriendBalance[];
  /** Groups you both belong to (not the direct one) */
  sharedGroups: Array<{ id: string; name: string; currency: string; net: number }>;
}

/**
 * What one person owes another inside a ledger: from the pairwise
 * suggestions (direct debts when simplify is off, simplified otherwise).
 */
function pairNet(
  suggestions: Array<{ fromUserId: string; toUserId: string; amount: number }>,
  me: string,
  them: string
): number {
  let c = 0;
  for (const s of suggestions) {
    if (s.fromUserId === them && s.toUserId === me) c += toCents(s.amount);
    if (s.fromUserId === me && s.toUserId === them) c -= toCents(s.amount);
  }
  return c / 100;
}

/** Everyone I have a direct group with, or share a group with, plus balances. */
export async function loadFriends(userId: string, onlyFriendId?: string): Promise<FriendRow[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, status: "ACTIVE", group: { isActive: true } },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          kind: true,
          currency: true,
          members: {
            where: { status: { in: ["ACTIVE", "INVITED"] }, userId: onlyFriendId ? onlyFriendId : { not: userId } },
            select: { user: { select: { id: true, name: true, displayName: true, email: true, status: true } } },
          },
        },
      },
    },
  });
  const rows = new Map<string, FriendRow>();
  const ledgers = new Map<string, Awaited<ReturnType<typeof loadGroupSettlements>>>();
  for (const { group: g } of memberships) {
    for (const { user: u } of g.members) {
      if (u.id === userId) continue;
      let row = rows.get(u.id);
      if (!row) {
        row = { id: u.id, name: u.name || u.displayName || u.email, email: u.email, isGhost: u.status === "GHOST", directGroupId: null, balances: [], sharedGroups: [] };
        rows.set(u.id, row);
      }
      if (!ledgers.has(g.id)) ledgers.set(g.id, await loadGroupSettlements(g.id));
      const ledger = ledgers.get(g.id);
      // What the group's settle-up asks between the two of you (direct
      // groups never simplify, so there it is the pair's real debt)
      const net = ledger ? pairNet(ledger.suggestedSettlements, userId, u.id) : 0;
      if (g.kind === "DIRECT") row.directGroupId = g.id;
      else row.sharedGroups.push({ id: g.id, name: g.name, currency: g.currency, net });
      const b = row.balances.find((x) => x.currency === g.currency);
      if (b) b.net = (toCents(b.net) + toCents(net)) / 100;
      else row.balances.push({ currency: g.currency, net });
    }
  }
  return [...rows.values()]
    .filter((r) => r.directGroupId || r.balances.some((b) => toCents(b.net) !== 0) || onlyFriendId)
    .map((r) => ({ ...r, balances: r.balances.filter((b) => toCents(b.net) !== 0 || r.balances.length === 1) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
