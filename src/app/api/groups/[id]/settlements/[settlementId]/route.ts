import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isActiveMember } from "@/lib/group-ledger";
import { toCents } from "@/lib/money";
import { HttpError, errorJson } from "@/lib/expense-write";
import { canManagePayment, RESTORE_WINDOW_DAYS, withinRestoreWindow } from "@/lib/permissions";
import { recordActivity, userNames } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string; settlementId: string }> };

const fail = (error: unknown) => {
  const { body, status } = errorJson(error);
  return NextResponse.json(body, { status });
};

/** Load a payment the signed-in user may change: payer, receiver or group admin. */
async function loadManagedPayment(groupId: string, settlementId: string, userId: string) {
  const me = await isActiveMember(groupId, userId);
  if (!me) throw new HttpError(403, "Access denied: You are not a member of this group");
  const s = await prisma.settlement.findFirst({ where: { id: settlementId, groupId } });
  if (!s || (s.status !== "CONFIRMED" && s.status !== "CANCELLED")) throw new HttpError(404, "Payment not found");
  if (me.archived) throw new HttpError(409, "This group is archived. Unarchive it in group settings to make changes.");
  if (!canManagePayment({ userId, payerId: s.payerId, payeeId: s.payeeId, role: me.role, archived: me.archived })) {
    throw new HttpError(403, "Only the payer, the receiver or a group admin can change this payment");
  }
  const names = await userNames([s.payerId, s.payeeId]);
  const base = { fromId: s.payerId, fromName: names.get(s.payerId), toId: s.payeeId, toName: names.get(s.payeeId) };
  return { s, base };
}

const EditSchema = z.object({
  amount: z.number().positive().optional(),
  method: z.enum(["CASH", "VENMO", "PAYPAL", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"]).optional(),
  description: z.string().max(200).optional().nullable(),
});

// PATCH /api/groups/[id]/settlements/[settlementId] - Edit amount / method / note
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: groupId, settlementId } = await params;
    const { s, base } = await loadManagedPayment(groupId, settlementId, session.user.id);
    if (s.status !== "CONFIRMED") throw new HttpError(400, "Restore this payment before editing it");
    const data = EditSchema.parse(await request.json());
    const before = toCents(Number(s.amount));
    const after = data.amount !== undefined ? toCents(data.amount) : before;
    if (after <= 0) throw new HttpError(400, "Amount must be greater than 0");
    await prisma.$transaction(async (tx) => {
      await tx.settlement.update({
        where: { id: s.id },
        data: {
          amount: after / 100,
          method: data.method,
          description: data.description === undefined ? undefined : data.description || null,
          updatedById: session.user.id,
        },
      });
      await recordActivity(
        {
          type: "PAYMENT_UPDATED",
          actorId: session.user.id,
          groupId,
          settlementId: s.id,
          payload: { ...base, amount: after, previousAmount: before },
        },
        tx
      );
    });
    return NextResponse.json({ id: s.id, amount: after / 100 });
  } catch (error) {
    return fail(error);
  }
}

// DELETE /api/groups/[id]/settlements/[settlementId] - Undo a payment (restorable)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: groupId, settlementId } = await params;
    const { s, base } = await loadManagedPayment(groupId, settlementId, session.user.id);
    if (s.status !== "CONFIRMED") throw new HttpError(400, "This payment is already deleted");
    await prisma.$transaction(async (tx) => {
      await tx.settlement.update({
        where: { id: s.id },
        data: { status: "CANCELLED", deletedAt: new Date(), deletedById: session.user.id },
      });
      await recordActivity(
        {
          type: "PAYMENT_DELETED",
          actorId: session.user.id,
          groupId,
          settlementId: s.id,
          payload: { ...base, amount: toCents(Number(s.amount)) },
        },
        tx
      );
    });
    return NextResponse.json({ message: "Payment deleted", restorable: true });
  } catch (error) {
    return fail(error);
  }
}

// POST /api/groups/[id]/settlements/[settlementId] { action: "restore" } - Undo the delete
export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id: groupId, settlementId } = await params;
    const body = await request.json().catch(() => ({}));
    if (body?.action !== "restore") throw new HttpError(400, "Unknown action");
    const { s, base } = await loadManagedPayment(groupId, settlementId, session.user.id);
    if (s.status !== "CANCELLED" || !s.deletedAt) throw new HttpError(400, "This payment is not deleted");
    if (!withinRestoreWindow(s.deletedAt)) {
      throw new HttpError(410, `Deleted payments can be restored for ${RESTORE_WINDOW_DAYS} days`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.settlement.update({
        where: { id: s.id },
        data: { status: "CONFIRMED", deletedAt: null, deletedById: null, updatedById: session.user.id },
      });
      await recordActivity(
        {
          type: "PAYMENT_RESTORED",
          actorId: session.user.id,
          groupId,
          settlementId: s.id,
          payload: { ...base, amount: toCents(Number(s.amount)) },
        },
        tx
      );
    });
    return NextResponse.json({ message: "Payment restored" });
  } catch (error) {
    return fail(error);
  }
}
