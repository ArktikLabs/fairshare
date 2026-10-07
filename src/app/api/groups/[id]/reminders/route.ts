import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/permissions";
import { ReminderError, sendReminder } from "@/lib/reminders";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  /** who owes (gets the reminder) */
  debtorId: z.string().min(1),
  /** who is owed; defaults to the caller. Admins may remind on behalf of others. */
  creditorId: z.string().min(1).optional(),
});

// POST /api/groups/[id]/reminders - remind someone to pay. 429 within 24h.
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { id } = await params;
    const me = await prisma.groupMember.findFirst({
      where: { groupId: id, userId, status: "ACTIVE", group: { isActive: true } },
      select: { role: true, group: { select: { archivedAt: true } } },
    });
    if (!me) return NextResponse.json({ error: "Access denied: Not a member of this group" }, { status: 403 });
    if (me.group.archivedAt) return NextResponse.json({ error: "This group is archived" }, { status: 409 });
    const body = Body.parse(await request.json());
    const creditorId = body.creditorId ?? userId;
    if (creditorId !== userId && !isAdminRole(me.role)) {
      return NextResponse.json({ error: "You can only send reminders for money owed to you" }, { status: 403 });
    }
    const r = await sendReminder({ groupId: id, creditorId, debtorId: body.debtorId });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof ReminderError) {
      return NextResponse.json(
        { error: e.message, retryAt: e.retryAt?.toISOString() },
        { status: e.status, headers: e.retryAt ? { "Retry-After": String(Math.ceil((e.retryAt.getTime() - Date.now()) / 1000)) } : undefined }
      );
    }
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Validation error", details: e.issues }, { status: 400 });
    console.error("Error sending reminder:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
