import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/permissions";
import { HttpError, errorJson } from "@/lib/expense-write";
import { dateToDay, dayToDate, nextOccurrence, todayIn } from "@/lib/recurrence";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({ status: z.enum(["ACTIVE", "PAUSED", "STOPPED"]) });

/** The owner or a group admin may manage a repeating expense. */
async function load(id: string, userId: string) {
  const r = await prisma.recurringExpense.findUnique({
    where: { id },
    include: { group: { select: { archivedAt: true, isActive: true } } },
  });
  if (!r || !r.group.isActive) throw new HttpError(404, "Not found");
  const m = await prisma.groupMember.findFirst({ where: { groupId: r.groupId, userId, status: "ACTIVE" }, select: { role: true } });
  if (!m) throw new HttpError(404, "Not found");
  if (r.ownerId !== userId && !isAdminRole(m.role)) throw new HttpError(403, "Only the person who set it up or a group admin can change this");
  if (r.group.archivedAt) throw new HttpError(409, "This group is archived");
  return r;
}

// PATCH /api/recurring/[id] { status } - pause, resume or stop
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const r = await load(id, session.user.id);
    const { status } = Body.parse(await request.json());
    if (r.status === "STOPPED") throw new HttpError(409, "This repeating expense was stopped");
    const data: { status: typeof status; nextDate?: Date; count?: number; lastError?: null } = { status };
    if (status === "ACTIVE" && r.status === "PAUSED") {
      // Resuming does not back-fill the paused period: skip to the next date from today
      const prefs = await prisma.userPreferences.findUnique({ where: { userId: r.ownerId }, select: { timezone: true } });
      const today = todayIn(prefs?.timezone);
      let count = r.count;
      let next = nextOccurrence(dateToDay(r.startDate), r.frequency, count, r.endDate ? dateToDay(r.endDate) : null);
      while (next && next < today && count < r.count + 1000) {
        count++;
        next = nextOccurrence(dateToDay(r.startDate), r.frequency, count, r.endDate ? dateToDay(r.endDate) : null);
      }
      if (!next) data.status = "STOPPED";
      else {
        data.nextDate = dayToDate(next);
        data.count = count;
      }
      data.lastError = null;
    }
    const updated = await prisma.recurringExpense.update({ where: { id }, data });
    return NextResponse.json({ id: updated.id, status: updated.status, nextDate: dateToDay(updated.nextDate) });
  } catch (error) {
    const { body, status } = errorJson(error);
    return NextResponse.json(body, { status });
  }
}
