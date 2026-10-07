import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isActiveMember, loadGroupSettlements } from "@/lib/group-ledger";
import { toCents } from "@/lib/money";

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

    const history = await prisma.settlement.findMany({
      where: { groupId, status: "CONFIRMED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        payer: { select: { id: true, name: true, email: true, displayName: true } },
        payee: { select: { id: true, name: true, email: true, displayName: true } },
      },
    });

    return NextResponse.json({
      ...settlements,
      history: history.map((s) => ({
        id: s.id,
        amount: Number(s.amount),
        method: s.method,
        description: s.description,
        createdAt: s.createdAt,
        createdBy: s.createdBy,
        from: { id: s.payer.id, name: s.payer.name || s.payer.displayName || s.payer.email },
        to: { id: s.payee.id, name: s.payee.name || s.payee.displayName || s.payee.email },
      })),
    });
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

    const settlement = await prisma.settlement.create({
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

    return NextResponse.json(
      { id: settlement.id, amount: Number(settlement.amount) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording settlement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
