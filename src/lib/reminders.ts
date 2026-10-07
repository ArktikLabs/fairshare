// Payment reminders: the creditor (or the weekly cron, if the group turned
// it on) nudges a debtor about a who-owes-whom suggestion. One reminder per
// pair per group per 24 hours; each one is an activity, so it reaches the
// debtor through their notification channels like any other event.

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./prisma";
import { recordActivity, userNames } from "./activity";
import { loadGroupSettlements } from "./group-ledger";
import { toCents } from "./money";

export const REMINDER_COOLDOWN_MS = 24 * 3600_000;
export const AUTO_REMIND_EVERY_MS = 7 * 24 * 3600_000;

export class ReminderError extends Error {
  constructor(public status: number, message: string, public retryAt?: Date) {
    super(message);
  }
}

/** When this pair may be reminded again (null = now). */
export async function nextReminderAt(groupId: string, fromUserId: string, toUserId: string, now = new Date()): Promise<Date | null> {
  const last = await prisma.paymentReminder.findFirst({
    where: { groupId, fromUserId, toUserId, createdAt: { gt: new Date(now.getTime() - REMINDER_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last ? new Date(last.createdAt.getTime() + REMINDER_COOLDOWN_MS) : null;
}

/** Map "from:to" -> ISO time the pair can be reminded again, for the UI. */
export async function reminderCooldowns(groupId: string, now = new Date()): Promise<Record<string, string>> {
  const rows = await prisma.paymentReminder.findMany({
    where: { groupId, createdAt: { gt: new Date(now.getTime() - REMINDER_COOLDOWN_MS) } },
    select: { fromUserId: true, toUserId: true, createdAt: true },
  });
  const out: Record<string, string> = {};
  for (const r of rows) {
    const until = new Date(r.createdAt.getTime() + REMINDER_COOLDOWN_MS).toISOString();
    const k = `${r.toUserId}:${r.fromUserId}`; // debtor:creditor, like suggestions
    if (!out[k] || out[k] < until) out[k] = until;
  }
  return out;
}

/**
 * Remind `debtorId` that they owe `creditorId` in this group. The amount is
 * the current suggested payment. `actorId` is the creditor (manual) or the
 * creditor on whose behalf the cron sends (auto).
 */
export async function sendReminder(opts: { groupId: string; creditorId: string; debtorId: string; auto?: boolean; now?: Date }) {
  const { groupId, creditorId, debtorId } = opts;
  const now = opts.now ?? new Date();
  if (creditorId === debtorId) throw new ReminderError(400, "You cannot remind yourself");
  const ledger = await loadGroupSettlements(groupId);
  if (!ledger) throw new ReminderError(404, "Group not found");
  const s = ledger.suggestedSettlements.find((x) => x.fromUserId === debtorId && x.toUserId === creditorId);
  if (!s || toCents(s.amount) <= 0) throw new ReminderError(409, "They do not owe you anything in this group");
  const retryAt = await nextReminderAt(groupId, creditorId, debtorId, now);
  if (retryAt) throw new ReminderError(429, "Already reminded in the last 24 hours", retryAt);

  const names = await userNames([debtorId]);
  const reminder = await prisma.paymentReminder.create({
    data: { groupId, fromUserId: creditorId, toUserId: debtorId, amount: new Decimal(s.amount), currency: ledger.currency, auto: Boolean(opts.auto), createdAt: now },
  });
  await recordActivity({
    type: "REMINDER_SENT",
    actorId: creditorId,
    groupId,
    targetUserId: debtorId,
    payload: { amount: toCents(s.amount), targetName: names.get(debtorId), fromId: debtorId, toId: creditorId },
  });
  return { id: reminder.id, amount: s.amount, currency: ledger.currency };
}

/** Cron: weekly automatic reminders for groups that turned them on. */
export async function runAutoReminders(now = new Date()): Promise<{ groups: number; sent: number }> {
  const groups = await prisma.group.findMany({
    where: {
      isActive: true,
      archivedAt: null,
      autoRemindWeekly: true,
      OR: [{ lastAutoRemindAt: null }, { lastAutoRemindAt: { lte: new Date(now.getTime() - AUTO_REMIND_EVERY_MS) } }],
    },
    select: { id: true, lastAutoRemindAt: true },
    take: 100,
  });
  let sent = 0;
  for (const g of groups) {
    // Claim the week first so overlapping cron runs do not double-send
    const claimed = await prisma.group.updateMany({
      where: { id: g.id, lastAutoRemindAt: g.lastAutoRemindAt },
      data: { lastAutoRemindAt: now },
    });
    if (claimed.count === 0) continue;
    const ledger = await loadGroupSettlements(g.id);
    if (!ledger) continue;
    const active = new Set(
      (await prisma.groupMember.findMany({ where: { groupId: g.id, status: "ACTIVE" }, select: { userId: true } })).map((m) => m.userId)
    );
    for (const s of ledger.suggestedSettlements) {
      if (!active.has(s.fromUserId) || !active.has(s.toUserId)) continue;
      try {
        await sendReminder({ groupId: g.id, creditorId: s.toUserId, debtorId: s.fromUserId, auto: true, now });
        sent++;
      } catch (e) {
        if (!(e instanceof ReminderError)) console.error("[reminders] auto reminder failed", g.id, e);
      }
    }
  }
  return { groups: groups.length, sent };
}
