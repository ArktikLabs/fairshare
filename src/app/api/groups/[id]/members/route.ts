import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createGroupInvitation } from "@/lib/invitation-utils";

const AddMemberSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  })
  .refine((data) => data.userId || data.email, {
    message: "Either userId or email must be provided",
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

// GET /api/groups/[id]/members - Get group members
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

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching group members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/members - Add member to group
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

    // Validate group admin access
    try {
      await validateGroupAdminAccess(session.user.id, groupId);
    } catch (adminError) {
      return NextResponse.json(
        {
          error:
            adminError instanceof Error ? adminError.message : "Access denied",
        },
        { status: 403 }
      );
    }

    let body;
    try {
      const rawBody = await request.text();
      console.log("Raw request body:", rawBody);

      if (!rawBody) {
        return NextResponse.json(
          { error: "Request body is empty" },
          { status: 400 }
        );
      }

      body = JSON.parse(rawBody);
      console.log("Parsed request body:", body);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validatedData = AddMemberSchema.parse(body);

    // Find user by userId or email
    let user;
    if (validatedData.userId) {
      user = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      });
    } else if (validatedData.email) {
      user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });
    }

    // If user doesn't exist, create an invitation
    if (!user && validatedData.email) {
      const invitation = await createGroupInvitation({
        groupId,
        email: validatedData.email,
        role: validatedData.role,
        invitedBy: session.user.id,
      });

      // TODO: Send email invitation here
      console.log(
        `Invitation created for ${validatedData.email}: ${invitation.token}`
      );

      return NextResponse.json({
        message: "Invitation sent successfully",
        isInvitation: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: validatedData.role,
          inviteLink: invitation.inviteLink,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: user.id,
      },
    });

    if (existingMember) {
      if (existingMember.isActive) {
        return NextResponse.json(
          { error: "User is already a member of this group" },
          { status: 400 }
        );
      } else {
        // Reactivate existing member
        await prisma.groupMember.update({
          where: { id: existingMember.id },
          data: {
            isActive: true,
            role: validatedData.role,
          },
        });
      }
    } else {
      // Add new member
      await prisma.groupMember.create({
        data: {
          groupId,
          userId: user.id,
          role: validatedData.role,
        },
      });
    }

    return NextResponse.json({
      message: "Member added successfully",
      isInvitation: false,
    });
  } catch (error) {
    console.error("Error adding member:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

