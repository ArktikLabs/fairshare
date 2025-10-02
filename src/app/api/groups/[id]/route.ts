import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).optional(),
  imageUrl: z.string().url().optional(),
});

// Helper function to validate group admin access
async function validateGroupAdminAccess(userId: string, groupId: string) {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      status: "ACTIVE",
      role: { in: ["ADMIN"] },
    },
  });

  if (!member) {
    throw new Error("Access denied: Admin privileges required");
  }

  return member;
}

// Helper function to validate group access
async function validateGroupAccess(userId: string, groupId: string) {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      status: "ACTIVE",
    },
  });

  if (!member) {
    throw new Error("Access denied: Not a member of this group");
  }

  return member;
}

// GET /api/groups/[id] - Get group details
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

    // Validate access
    await validateGroupAccess(session.user.id, groupId);

    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
        isActive: true,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        members: {
          where: { status: { in: ["ACTIVE", "INVITED"] } },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        expenses: {
          where: { isDeleted: false },
          include: {
            payers: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
            splits: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            expenses: {
              where: { isDeleted: false },
            },
            members: {
              where: { status: { in: ["ACTIVE", "INVITED"] } },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/groups/[id] - Update group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Validate admin access
    await validateGroupAdminAccess(session.user.id, groupId);

    const body = await request.json();
    const validatedData = UpdateGroupSchema.parse(body);

    const updatedGroup = await prisma.group.update({
      where: {
        id: groupId,
        isActive: true,
      },
      data: validatedData,
      include: {
        members: {
          where: { status: { in: ["ACTIVE", "INVITED"] } },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error updating group:", error);
    
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

// DELETE /api/groups/[id] - Delete group (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Only group creator can delete
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
        isActive: true,
        createdBy: session.user.id,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found or access denied" },
        { status: 404 }
      );
    }

    // Soft delete the group and deactivate members
    await prisma.$transaction(async (tx) => {
      await tx.group.update({
        where: { id: groupId },
        data: { isActive: false },
      });

      await tx.groupMember.updateMany({
        where: { groupId },
        data: { status: "LEFT" },
      });

      // Mark expenses as deleted
      await tx.expense.updateMany({
        where: { groupId },
        data: { isDeleted: true },
      });
    });

    return NextResponse.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
