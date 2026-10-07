// Weekly summary email for people who chose it (Account > Notifications):
// what happened in their groups in the last 7 days and where they stand.
// Sent at most once per 7 days per person; queued through the outbox.

import { prisma } from "../prisma";
import { appUrl } from "../mailer";
import { describeActivity, type ActivityPayload } from "../activity-format";
import { loadUserOverview } from "../overview";
import { formatCurrency } from "../utils";
import { emailLayout } from "./render";
import { enqueue } from "./outbox";
import { manageUrl, unsubscribeUrl } from "./dispatch";

const WEEK = 7 * 24 * 3600_000;

export async function runDigests(now = new Date(), limit = 50): Promise<{ queued: number }> {
  const due = await prisma.userPreferences.findMany({
    where: {
      emailDigest: "WEEKLY",
      user: { status: "ACTIVE" },
      OR: [{ lastDigestAt: null }, { lastDigestAt: { lte: new Date(now.getTime() - WEEK) } }],
    },
    select: { userId: true, lastDigestAt: true },
    take: limit,
  });
  let queued = 0;
  for (const p of due) {
    // Claim first so overlapping runs do not double-send
    const claimed = await prisma.userPreferences.updateMany({
      where: { userId: p.userId, lastDigestAt: p.lastDigestAt },
      data: { lastDigestAt: now },
    });
    if (claimed.count === 0) continue;
    const msg = await buildDigest(p.userId, new Date(now.getTime() - WEEK));
    if (!msg) continue;
    const week = now.toISOString().slice(0, 10);
    const ids = await enqueue([
      { userId: p.userId, event: "digest", channel: "EMAIL", dedupeKey: `digest:${p.userId}:${week}`, payload: msg },
    ]);
    queued += ids.length;
  }
  return { queued };
}

async function buildDigest(userId: string, since: Date) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return null;
  const groups = await prisma.groupMember.findMany({
    where: { userId, status: "ACTIVE", group: { isActive: true } },
    select: { groupId: true },
  });
  const activity = await prisma.activity.findMany({
    where: { groupId: { in: groups.map((g) => g.groupId) }, createdAt: { gte: since }, actorId: { not: userId } },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  const overview = await loadUserOverview(userId);
  const balances = Object.entries(overview.totals).filter(([, t]) => Math.round(t.net * 100) !== 0);
  if (activity.length === 0 && balances.length === 0) return null;

  const lines: string[] = [];
  if (balances.length) {
    lines.push(
      "Where you stand: " +
        balances.map(([c, t]) => (t.net > 0 ? `you are owed ${formatCurrency(t.net, c)}` : `you owe ${formatCurrency(-t.net, c)}`)).join(", ") +
        "."
    );
  } else {
    lines.push("You are all settled up.");
  }
  if (activity.length) {
    lines.push(`This week in your groups (${activity.length}${activity.length === 15 ? "+" : ""}):`);
    for (const a of activity) {
      lines.push(`• ${describeActivity({ ...a, payload: (a.payload ?? {}) as ActivityPayload }, userId).text}`);
    }
  }
  const { text, html } = emailLayout({
    heading: "Your week on FairShare",
    lines,
    cta: { label: "Open FairShare", url: appUrl("/dashboard") },
    footer: {
      manageUrl: manageUrl(),
      unsubscribeUrl: unsubscribeUrl(userId, "digest"),
      reason: "You get this weekly summary because you turned it on.",
    },
  });
  return { subject: "Your week on FairShare", text, html, headers: { "List-Unsubscribe": `<${unsubscribeUrl(userId, "digest")}>` } };
}
