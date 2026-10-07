import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isActiveMember, loadGroupSettlements, loadPaymentHistory } from "@/lib/group-ledger";
import { toCents } from "@/lib/money";
import { recordActivity, userNames } from "@/lib/activity";

// GET /api/groups/[id]/settlements - Balances, suggested payments and payment history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    if (!(await isActiveMember(groupId, session.user.id))) {
      return NextResponse.json(
        { error: "Access denied: You are not a member of this group" },
        { status: 403 }
      );
    }

    const settlements = await loadGroupSettlements(groupId);
    if (!settlements) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const me = await isActiveMember(groupId, session.user.id);
    const history = await loadPaymentHistory(groupId, 50, {
      viewerId: session.user.id,
      isAdmin: me?.role === "ADMIN" || me?.role === "OWNER",
      archived: Boolean(me?.archived),
    });
    return NextResponse.json({ ...settlements, history });
  } catch (error) {
    console.error("Error calculating settlements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const RecordPaymentSchema = z.object({
  // Defaults to the signed-in user ("I paid someone back")
  fromUserId: z.string().min(1).optional(),
  toUserId: z.string().min(1),
  amount: z.number().positive(),
  method: z
    .enum(["CASH", "VENMO", "PAYPAL", "BANK_TRANSFER", "CREDIT_CARD", "OTHER"])
    .default("CASH"),
  description: z.string().max(200).optional(),
});

// POST /api/groups/[id]/settlements - Record a payment between two people.
// Either side of the payment (or a group admin) can record it.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: groupId } = await params;

    const me = await isActiveMember(groupId, session.user.id);
    if (!me) {
      return NextResponse.json(
        { error: "Access denied: You are not a member of this group" },
        { status: 403 }
      );
    }

    if (me.archived) {
      return NextResponse.json(
        { error: "This group is archived. Unarchive it in group settings to make changes." },
        { status: 409 }
      );
    }

    const parsed = RecordPaymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const { toUserId, amount, method, description } = parsed.data;
    const fromUserId = parsed.data.fromUserId ?? session.user.id;

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: "Payer and payee must differ" }, { status: 400 });
    }
    const isAdmin = me.role === "ADMIN" || me.role === "OWNER";
    if (!isAdmin && session.user.id !== fromUserId && session.user.id !== toUserId) {
      return NextResponse.json(
        { error: "Only the people involved or a group admin can record this payment" },
        { status: 403 }
      );
    }

    // Both people must be on this group's books
    const ledger = await loadGroupSettlements(groupId);
    if (!ledger) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const ids = new Set(ledger.balances.map((b) => b.userId));
    if (!ids.has(fromUserId) || !ids.has(toUserId)) {
      return NextResponse.json(
        { error: "Both people must be part of this group" },
        { status: 400 }
      );
    }

    const names = await userNames([fromUserId, toUserId]);
    const settlement = await prisma.$transaction(async (tx) => {
      const s = await tx.settlement.create({
        data: {
          groupId,
          payerId: fromUserId,
          payeeId: toUserId,
          amount: toCents(amount) / 100,
          method,
          description,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          createdBy: session.user.id,
        },
      });
      await recordActivity(
        {
          type: "PAYMENT_RECORDED",
          actorId: session.user.id,
          groupId,
          settlementId: s.id,
          payload: {
            amount: toCents(amount),
            fromId: fromUserId,
            fromName: names.get(fromUserId),
            toId: toUserId,
            toName: names.get(toUserId),
          },
        },
        tx
      );
      return s;
    });

    return NextResponse.json(
      { id: settlement.id, amount: Number(settlement.amount) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording settlement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
