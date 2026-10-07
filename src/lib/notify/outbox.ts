// Notification outbox: rows are queued per recipient per channel, then sent.
// Sending claims a row (PENDING -> SENDING) so two workers never send twice;
// failures are retried with backoff up to MAX_ATTEMPTS.

import type { NotificationChannel, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { deliverMail } from "../mailer";
import { sendWhatsAppText } from "./whatsapp-waha";

export const MAX_ATTEMPTS = 5;

export interface QueuedMessage {
  userId: string;
  activityId?: string | null;
  event: string;
  channel: NotificationChannel;
  dedupeKey: string;
  /** EMAIL: { to, subject, text, html, headers } ; WHATSAPP: { to, text } */
  payload: Record<string, unknown>;
  /** Write as SKIPPED with this reason (kept for the audit trail) */
  skipReason?: string;
}

/** Insert rows, ignoring ones already queued (dedupeKey). Returns new ids. */
export async function enqueue(messages: QueuedMessage[]): Promise<string[]> {
  if (messages.length === 0) return [];
  const existing = await prisma.notification.findMany({
    where: { dedupeKey: { in: messages.map((m) => m.dedupeKey) } },
    select: { dedupeKey: true },
  });
  const seen = new Set(existing.map((e) => e.dedupeKey));
  const fresh = messages.filter((m) => !seen.has(m.dedupeKey));
  if (fresh.length === 0) return [];
  await prisma.notification.createMany({
    data: fresh.map((m) => ({
      userId: m.userId,
      activityId: m.activityId ?? null,
      event: m.event,
      channel: m.channel,
      dedupeKey: m.dedupeKey,
      payload: m.payload as Prisma.InputJsonValue,
      status: m.skipReason ? "SKIPPED" : "PENDING",
      lastError: m.skipReason ?? null,
    })),
    skipDuplicates: true,
  });
  const rows = await prisma.notification.findMany({
    where: { dedupeKey: { in: fresh.map((m) => m.dedupeKey) }, status: "PENDING" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

const backoffMs = (attempt: number) => Math.min(6 * 3600_000, 60_000 * 2 ** attempt);

/** Send one queued row. Safe to call twice (only one claim wins). */
export async function sendNotification(id: string): Promise<"sent" | "failed" | "retry" | "skipped" | "busy"> {
  const claimed = await prisma.notification.updateMany({
    where: { id, status: "PENDING", nextAttemptAt: { lte: new Date() } },
    data: { status: "SENDING", attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return "busy";
  const n = await prisma.notification.findUnique({
    where: { id },
    include: { user: { select: { email: true, phone: true, phoneVerifiedAt: true, status: true } } },
  });
  if (!n) return "busy";
  const p = (n.payload ?? {}) as Record<string, string | Record<string, string>>;

  let result: { ok: true } | { ok: false; error: string; notConfigured?: boolean; retryable?: boolean };
  if (n.channel === "EMAIL") {
    result = await deliverMail({
      to: n.user.email,
      subject: String(p.subject ?? "FairShare"),
      text: String(p.text ?? ""),
      html: typeof p.html === "string" ? p.html : undefined,
      headers: (p.headers as Record<string, string> | undefined) ?? undefined,
    });
  } else {
    // Re-check at send time: the number may have changed since queueing
    if (!n.user.phone || !n.user.phoneVerifiedAt) {
      result = { ok: false, error: "No verified WhatsApp number", notConfigured: true };
    } else {
      result = await sendWhatsAppText(n.user.phone, String(p.text ?? ""));
    }
  }

  if (result.ok) {
    await prisma.notification.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
    return "sent";
  }
  if (result.notConfigured) {
    await prisma.notification.update({ where: { id }, data: { status: "SKIPPED", lastError: result.error } });
    return "skipped";
  }
  const retry = result.retryable !== false && n.attempts < MAX_ATTEMPTS;
  await prisma.notification.update({
    where: { id },
    data: {
      status: retry ? "PENDING" : "FAILED",
      lastError: result.error.slice(0, 500),
      nextAttemptAt: new Date(Date.now() + backoffMs(n.attempts)),
    },
  });
  return retry ? "retry" : "failed";
}

/** Send everything due (cron). Rows stuck in SENDING for 10 min are released first. */
export async function drainOutbox(limit = 100): Promise<Record<string, number>> {
  await prisma.notification.updateMany({
    where: { status: "SENDING", updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
    data: { status: "PENDING" },
  });
  const due = await prisma.notification.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });
  const counts: Record<string, number> = { sent: 0, failed: 0, retry: 0, skipped: 0, busy: 0 };
  for (const d of due) counts[await sendNotification(d.id)]++;
  return counts;
}
