import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateGroupSettlements } from "@/lib/settlement-utils";

// GET /api/groups/[id]/settlements - Get settlement suggestions for a group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied: You are not a member of this group" },
        { status: 403 }
      );
    }

    // Get group with members and expenses
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { status: "ACTIVE" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        expenses: {
          where: { isDeleted: false },
          include: {
            payers: {
              select: {
                userId: true,
                amountPaid: true,
              },
            },
            splits: {
              select: {
                userId: true,
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Calculate settlements
    const expensesForCalculation = group.expenses.map(expense => ({
      amount: Number(expense.amount),
      payers: expense.payers.map(payer => ({
        userId: payer.userId,
        amountPaid: Number(payer.amountPaid),
      })),
      splits: expense.splits.map(split => ({
        userId: split.userId,
        amount: Number(split.amount),
      })),
    }));

    const settlements = calculateGroupSettlements(
      group.id,
      group.currency,
      group.members,
      expensesForCalculation
    );

    return NextResponse.json(settlements);
  } catch (error) {
    console.error("Error calculating settlements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
