// Turns one Activity into outbox rows: who should hear about it (never the
// actor), on which channels (their preferences; WhatsApp only to a verified
// number and only when WAHA is configured), rendered per recipient.

import { prisma } from "../prisma";
import { appUrl } from "../mailer";
import type { ActivityLike, ActivityPayload } from "../activity-format";
import { describeActivity } from "../activity-format";
import { eventForActivity, recipientsFor, wants, type NotifyEvent } from "./events";
import { enqueue, sendNotification, type QueuedMessage } from "./outbox";
import { loadPrefRows } from "./prefs";
import { renderActivity } from "./render";
import { makeUnsubscribeToken } from "./token";
import { isWhatsAppConfigured } from "./whatsapp-waha";

export function manageUrl() {
  return appUrl("/account?tab=notifications");
}

export function unsubscribeUrl(userId: string, event: string, channel: "email" | "whatsapp" = "email") {
  return appUrl(`/unsubscribe?t=${encodeURIComponent(makeUnsubscribeToken({ u: userId, e: event, c: channel }))}`);
}

/** RFC 8058 one-click target (mail clients POST here; the page link is for people). */
export function oneClickUrl(pageUrl: string) {
  return pageUrl.replace("/unsubscribe?", "/api/unsubscribe?");
}

const REASON: Record<NotifyEvent, string> = {
  expense_added: "You get this because an expense you are on was added.",
  expense_changed: "You get this because an expense you are on changed.",
  payment: "You get this because a payment to or from you was recorded.",
  reminder: "You get this because someone asked you to settle up.",
  comment: "You get this because someone commented on an expense you are on.",
  group_invite: "You get this because someone added you on FairShare.",
  member_joined: "You get this because someone joined a group you are in.",
};

/** Rows to queue for one activity (exported for tests via the smoke run). */
async function buildMessages(a: ActivityLike & { id: string }): Promise<QueuedMessage[]> {
  const event = eventForActivity(a.type);
  if (!event) return [];
  const ctx: { expensePeople?: string[]; groupMembers?: string[] } = {};
  if (a.type === "COMMENT_ADDED" && a.expenseId) {
    const e = await prisma.expense.findUnique({
      where: { id: a.expenseId },
      select: {
        createdById: true,
        payers: { select: { userId: true } },
        splits: { select: { userId: true } },
        items: { select: { splits: { select: { userId: true } } } },
      },
    });
    if (e) {
      ctx.expensePeople = [
        ...(e.createdById ? [e.createdById] : []),
        ...e.payers.map((p) => p.userId),
        ...e.splits.map((s) => s.userId),
        ...e.items.flatMap((i) => i.splits.map((s) => s.userId)),
      ];
    }
  }
  if (a.type === "MEMBER_JOINED" && a.groupId) {
    const m = await prisma.groupMember.findMany({ where: { groupId: a.groupId, status: "ACTIVE" }, select: { userId: true } });
    ctx.groupMembers = m.map((x) => x.userId);
  }
  const recipients = recipientsFor(a, ctx);
  if (recipients.length === 0) return [];

  // Only people still in the group hear about group events
  let allowed = new Set(recipients);
  if (a.groupId && a.type !== "MEMBER_INVITED" && a.type !== "FRIEND_ADDED") {
    const active = await prisma.groupMember.findMany({
      where: { groupId: a.groupId, userId: { in: recipients }, status: "ACTIVE" },
      select: { userId: true },
    });
    allowed = new Set(active.map((m) => m.userId));
  }
  const users = await prisma.user.findMany({
    where: { id: { in: recipients.filter((id) => allowed.has(id)) } },
    select: { id: true, email: true, status: true, phone: true, phoneVerifiedAt: true },
  });
  const prefs = await loadPrefRows(users.map((u) => u.id));
  const waReady = isWhatsAppConfigured();
  const out: QueuedMessage[] = [];

  for (const u of users) {
    const rows = prefs.get(u.id) ?? [];
    const open = describeActivity(a, u.id).href;
    const unsub = unsubscribeUrl(u.id, event);
    const r = renderActivity(a, u.id, { open: open ? appUrl(open) : null, manageUrl: manageUrl(), unsubscribeUrl: unsub }, REASON[event]);
    // Placeholder (invited) users have no account yet: email only for
    // reminders (their invite email already covers the group)
    const isGhost = u.status === "GHOST";
    if (wants(rows, event, "email") && (!isGhost || event === "reminder")) {
      out.push({
        userId: u.id,
        activityId: a.id,
        event,
        channel: "EMAIL",
        dedupeKey: `${a.id}:${u.id}:EMAIL`,
        payload: {
          subject: r.subject,
          text: r.text,
          html: r.html,
          headers: { "List-Unsubscribe": `<${oneClickUrl(unsub)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        },
      });
    }
    if (wants(rows, event, "whatsapp") && u.phone && u.phoneVerifiedAt) {
      out.push({
        userId: u.id,
        activityId: a.id,
        event,
        channel: "WHATSAPP",
        dedupeKey: `${a.id}:${u.id}:WHATSAPP`,
        payload: { text: r.whatsapp },
        skipReason: waReady ? undefined : "WhatsApp is not configured",
      });
    }
  }
  return out;
}

/**
 * Queue and send notifications for one activity. Returns "missing" when the
 * row is not visible yet (its transaction has not committed), "done" when it
 * was already handled. Never throws for delivery problems.
 */
export async function dispatchActivity(activityId: string, opts: { send?: boolean } = {}): Promise<"missing" | "done" | "queued"> {
  const row = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!row) return "missing";
  if (row.notifiedAt) return "done";
  // Claim the activity so two dispatchers never both fan out
  const claimed = await prisma.activity.updateMany({ where: { id: activityId, notifiedAt: null }, data: { notifiedAt: new Date() } });
  if (claimed.count === 0) return "done";
  const a = { ...row, payload: (row.payload ?? {}) as ActivityPayload };
  try {
    const ids = await enqueue(await buildMessages(a));
    if (opts.send !== false) for (const id of ids) await sendNotification(id);
  } catch (e) {
    // Let the cron job retry the fan-out
    await prisma.activity.update({ where: { id: activityId }, data: { notifiedAt: null } }).catch(() => {});
    throw e;
  }
  return "queued";
}

/** Cron: fan out activities a crash or restart left behind (older than 1 minute). */
export async function dispatchPending(limit = 200): Promise<number> {
  const rows = await prisma.activity.findMany({
    // Never older than 2 days: stale news is worse than none
    where: { notifiedAt: null, createdAt: { lt: new Date(Date.now() - 60_000), gt: new Date(Date.now() - 2 * 86_400_000) } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  let n = 0;
  for (const r of rows) {
    try {
      if ((await dispatchActivity(r.id, { send: false })) === "queued") n++;
    } catch (e) {
      console.error("[notify] pending dispatch failed", r.id, e);
    }
  }
  return n;
}
