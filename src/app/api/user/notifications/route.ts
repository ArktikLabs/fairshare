import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { EVENT_KEYS, type NotifyEvent } from "@/lib/notify/events";
import { loadNotificationSettings, setDigest, setEventPref } from "@/lib/notify/prefs";

// GET /api/user/notifications - preferences + WhatsApp status
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await loadNotificationSettings(session.user.id));
}

const Body = z.object({
  events: z
    .array(
      z.object({
        key: z.enum(EVENT_KEYS as [NotifyEvent, ...NotifyEvent[]]),
        email: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
      })
    )
    .optional(),
  digest: z.enum(["WEEKLY", "NEVER"]).optional(),
});

// PATCH /api/user/notifications { events?: [{key, email?, whatsapp?}], digest? }
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  for (const e of parsed.data.events ?? []) await setEventPref(session.user.id, e.key, { email: e.email, whatsapp: e.whatsapp });
  if (parsed.data.digest) await setDigest(session.user.id, parsed.data.digest);
  return NextResponse.json(await loadNotificationSettings(session.user.id));
}
