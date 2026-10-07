import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { PhoneError, confirmVerification, issueTestCode, removePhone, startVerification } from "@/lib/notify/phone";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send"), phone: z.string().min(4).max(32) }),
  z.object({ action: z.literal("verify"), code: z.string().min(1).max(12) }),
  // Smoke tests only: outside production, with the cron secret
  z.object({ action: z.literal("test-code"), code: z.string().regex(/^\d{6}$/) }),
]);

function fail(e: unknown) {
  if (e instanceof PhoneError) {
    return NextResponse.json({ error: e.message, retryAt: e.retryAt?.toISOString() }, { status: e.status });
  }
  console.error("Phone verification error:", e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// POST /api/user/phone { action: "send", phone } | { action: "verify", code }
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "send") return NextResponse.json(await startVerification(session.user.id, b.phone));
    if (b.action === "verify") return NextResponse.json({ ok: true, ...(await confirmVerification(session.user.id, b.code)) });
    const secret = process.env.CRON_SECRET;
    if (process.env.NODE_ENV === "production" || !secret || request.headers.get("x-test-secret") !== secret) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await issueTestCode(session.user.id, b.code);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

// DELETE /api/user/phone - remove the number
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await removePhone(session.user.id);
  return NextResponse.json({ ok: true });
}
