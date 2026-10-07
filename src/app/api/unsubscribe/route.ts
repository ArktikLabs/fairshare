import { NextRequest, NextResponse } from "next/server";
import { readUnsubscribeToken } from "@/lib/notify/token";
import { applyUnsubscribe } from "@/lib/notify/unsubscribe";

// POST /api/unsubscribe?t=<token> - one-click unsubscribe (RFC 8058; also
// used by the /unsubscribe page button). No login: the signed token names
// the user, the event and the channel.
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  let token = url.searchParams.get("t");
  if (!token) {
    const form = await request.formData().catch(() => null);
    const t = form?.get("t");
    token = typeof t === "string" ? t : null;
  }
  const claim = readUnsubscribeToken(token);
  if (!claim) return NextResponse.json({ error: "This link is not valid" }, { status: 400 });
  const done = await applyUnsubscribe(claim);
  if (!done) return NextResponse.json({ error: "This link is not valid" }, { status: 400 });
  return NextResponse.json({ ok: true, ...done });
}
