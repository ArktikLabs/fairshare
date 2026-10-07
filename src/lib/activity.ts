// The one place that records activity. Every event (expense, payment, member,
// group, comment) goes through recordActivity(), so the activity feed, the
// expense edit history and (later) notifications all read the same rows.
// Notifications hook in here: after the row is written, scheduleNotify()
// fans out to the people affected, outside the DB transaction.

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import type { ActivityLike, ActivityPayload, ActivityTypeName } from "./activity-format";
import { scheduleNotify } from "./notify/schedule";

type Db = PrismaClient | Prisma.TransactionClient;

export interface ActivityInput {
  type: ActivityTypeName;
  actorId: string;
  groupId?: string | null;
  expenseId?: string | null;
  settlementId?: string | null;
  commentId?: string | null;
  targetUserId?: string | null;
  payload?: ActivityPayload;
}

const nameOf = (u: { name: string | null; displayName?: string | null; email: string } | null) =>
  u ? u.name || u.displayName || u.email : "Someone";

/**
 * Record one event. Fills in the actor's and group's names (and the group
 * currency) so lines read right later even if people rename. Pass the
 * transaction client when the event is part of a write, so both commit or
 * roll back together.
 */
export async function recordActivity(input: ActivityInput, db: Db = prisma) {
  const [actor, group] = await Promise.all([
    db.user.findUnique({ where: { id: input.actorId }, select: { name: true, displayName: true, email: true } }),
    input.groupId
      ? db.group.findUnique({
          where: { id: input.groupId },
          select: { name: true, currency: true, kind: true, members: { where: { status: "ACTIVE" }, select: { userId: true } } },
        })
      : Promise.resolve(null),
  ]);
  const payload: ActivityPayload = {
    actorName: nameOf(actor),
    ...(group ? { groupName: group.name, currency: group.currency } : {}),
    ...(group?.kind === "DIRECT" ? { direct: group.members.map((m) => m.userId).sort() } : {}),
    ...input.payload,
  };
  const row = await db.activity.create({
    data: {
      type: input.type,
      actorId: input.actorId,
      groupId: input.groupId ?? null,
      expenseId: input.expenseId ?? null,
      settlementId: input.settlementId ?? null,
      commentId: input.commentId ?? null,
      targetUserId: input.targetUserId ?? null,
      payload: payload as Prisma.InputJsonValue,
    },
  });
  // Notifications go out after the change commits, never inside it: inside
  // a transaction the dispatcher is scheduled for after the commit (and the
  // cron job picks up anything a crash left behind via notifiedAt).
  scheduleNotify(row.id, db === prisma);
  return row;
}

/** Display names for a set of user ids (for payment / member payloads). */
export async function userNames(ids: string[], db: Db = prisma): Promise<Map<string, string>> {
  const users = await db.user.findMany({
    where: { id: { in: [...new Set(ids)] } },
    select: { id: true, name: true, displayName: true, email: true },
  });
  return new Map(users.map((u) => [u.id, nameOf(u)]));
}

export interface FeedRow extends ActivityLike {
  id: string;
  createdAt: string;
  actorName: string;
}

/**
 * Activity the viewer may see, newest first: everything in groups they are
 * (or were, while archived) an active member of. `groupId` narrows to one
 * group (the caller must have checked membership).
 */
export async function loadActivity(opts: {
  viewerId: string;
  groupId?: string;
  limit?: number;
  cursor?: string | null;
}): Promise<{ items: FeedRow[]; nextCursor: string | null }> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 30));
  let where: Prisma.ActivityWhereInput;
  if (opts.groupId) {
    where = { groupId: opts.groupId };
  } else {
    const groups = await prisma.groupMember.findMany({
      where: { userId: opts.viewerId, status: "ACTIVE", group: { isActive: true } },
      select: { groupId: true },
    });
    where = {
      OR: [
        { groupId: { in: groups.map((g) => g.groupId) } },
        { groupId: null, OR: [{ actorId: opts.viewerId }, { targetUserId: opts.viewerId }] },
      ],
    };
  }
  const rows = await prisma.activity.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, limit);
  return {
    items: page.map((r) => ({
      id: r.id,
      type: r.type,
      actorId: r.actorId,
      groupId: r.groupId,
      expenseId: r.expenseId,
      settlementId: r.settlementId,
      targetUserId: r.targetUserId,
      payload: (r.payload ?? {}) as ActivityPayload,
      createdAt: r.createdAt.toISOString(),
      actorName: ((r.payload ?? {}) as ActivityPayload).actorName ?? "Someone",
    })),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
  };
}
