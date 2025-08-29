import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

// Helper function to validate group admin access
async function validateGroupAdminAccess(userId: string, groupId: string) {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      isActive: true,
      role: { in: ["ADMIN"] },
    },
  });

  if (!member) {
    throw new Error("Access denied: Admin privileges required");
  }

  return member;
}

// PUT /api/groups/[id]/members/[memberId] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, memberId } = await params;

    // Validate admin access
    await validateGroupAdminAccess(session.user.id, groupId);

    const body = await request.json();
    const validatedData = UpdateMemberSchema.parse(body);

    // Check if member exists
    const member = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId,
        isActive: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent changing your own role
    if (member.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const updatedMember = await prisma.groupMember.update({
      where: { id: memberId },
      data: { role: validatedData.role },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating member:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/members/[memberId] - Remove member from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, memberId } = await params;

    // Validate admin access
    await validateGroupAdminAccess(session.user.id, groupId);

    // Check if member exists
    const member = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId,
        isActive: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent removing yourself
    if (member.userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself from the group" },
        { status: 400 }
      );
    }

    // Check if member has unsettled expenses
    const unsettledExpenses = await prisma.expenseSplit.count({
      where: {
        userId: member.userId,
        expense: {
          groupId,
          isDeleted: false,
        },
        // Add logic to check if the expense is settled
      },
    });

    if (unsettledExpenses > 0) {
      return NextResponse.json(
        { 
          error: "Cannot remove member with unsettled expenses",
          details: `Member has ${unsettledExpenses} unsettled expenses`
        },
        { status: 400 }
      );
    }

    // Soft delete the member
    await prisma.groupMember.update({
      where: { id: memberId },
      data: { 
        isActive: false,
        leftAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error removing member:", error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
