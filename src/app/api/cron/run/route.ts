import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dispatchPending } from "@/lib/notify/dispatch";
import { drainOutbox } from "@/lib/notify/outbox";
import { runDigests } from "@/lib/notify/digest";
import { runRecurring } from "@/lib/recurring";
import { runAutoReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const got = request.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

let running = false;

// POST /api/cron/run (Authorization: Bearer $CRON_SECRET)
// Creates due recurring expenses, sends weekly auto-reminders and digests,
// then drains the notification outbox. Every step is idempotent, so running
// it twice (or overlapping) never duplicates anything.
// Testing: { "now": "2026-11-01T09:00:00Z" } fakes the clock for recurring
// expenses and reminders; ignored in production unless CRON_ALLOW_FAKE_NOW=1.
export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (running) return NextResponse.json({ ok: true, skipped: "already running" }, { status: 202 });
  running = true;
  const started = Date.now();
  try {
    let now = new Date();
    const body = (await request.json().catch(() => ({}))) as { now?: string; only?: string[] };
    const fakeAllowed = process.env.NODE_ENV !== "production" || process.env.CRON_ALLOW_FAKE_NOW === "1";
    if (body.now && fakeAllowed) {
      const d = new Date(body.now);
      if (!Number.isNaN(d.getTime())) now = d;
    }
    const only = Array.isArray(body.only) ? new Set(body.only) : null;
    const step = async <T,>(name: string, fn: () => Promise<T>): Promise<T | { error: string } | undefined> => {
      if (only && !only.has(name)) return undefined;
      try {
        return await fn();
      } catch (e) {
        console.error(`[cron] ${name} failed`, e);
        return { error: e instanceof Error ? e.message : String(e) };
      }
    };
    const recurring = await step("recurring", () => runRecurring(now));
    const reminders = await step("reminders", () => runAutoReminders(now));
    const digests = await step("digests", () => runDigests(now));
    const fanout = await step("fanout", () => dispatchPending());
    const outbox = await step("outbox", () => drainOutbox());
    return NextResponse.json({
      ok: true,
      now: now.toISOString(),
      tookMs: Date.now() - started,
      recurring,
      reminders,
      digests,
      fanout,
      outbox,
    });
  } finally {
    running = false;
  }
}
