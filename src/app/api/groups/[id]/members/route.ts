import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { inviteUserToGroup, getUserDisplayName, isGhostUser } from "@/lib/ghost-users";
import { appUrl, sendMail } from "@/lib/mailer";
import { recordActivity } from "@/lib/activity";

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
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN"] },
    },
  });

  if (!member) {
    throw new Error("Access denied: Admin privileges required");
  }
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { archivedAt: true, isActive: true } });
  if (!group?.isActive) throw new Error("Access denied: Group not found");
  if (group.archivedAt) throw new Error("This group is archived. Unarchive it in group settings to invite people.");

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
        status: "ACTIVE",
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        status: { in: ["INVITED", "ACTIVE"] }, // Show both invited and active members
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            displayName: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: "asc" }, // Active members first
        { joinedAt: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Transform the response to include display names and ghost status
    const transformedMembers = members.map(member => ({
      ...member,
      user: {
        ...member.user,
        displayName: getUserDisplayName(member.user),
        isGhost: isGhostUser(member.user),
      }
    }));

    return NextResponse.json(transformedMembers);
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

    if ((await prisma.group.findUnique({ where: { id: groupId }, select: { kind: true } }))?.kind === "DIRECT") {
      return NextResponse.json({ error: "A 1:1 balance with a friend has exactly two people" }, { status: 400 });
    }

    // Validate group admin access
    try {
      await validateGroupAdminAccess(session.user.id, groupId);
    } catch (adminError) {
      return NextResponse.json(
        {
          error:
            adminError instanceof Error ? adminError.message : "Access denied",
        },
        { status: adminError instanceof Error && adminError.message.includes("archived") ? 409 : 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validatedData = AddMemberSchema.parse(body);

    // Use Ghost Users system for all invitations
    let email = validatedData.email?.trim().toLowerCase();
    const userId = validatedData.userId;

    // If userId is provided, get the user's email
    if (userId && !email) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      email = user.email;
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required for invitations" },
        { status: 400 }
      );
    }

    try {
      // Create invitation using Ghost Users system
      const groupMember = await inviteUserToGroup({
        email,
        groupId,
        invitedBy: session.user.id,
        role: validatedData.role,
        expiresInDays: 7,
      });

      const inviteLink = groupMember.inviteToken
        ? appUrl(`/invite/${groupMember.inviteToken}`)
        : null;

      const alreadyInvited = "alreadyInvited" in groupMember && groupMember.alreadyInvited === true;
      if (!alreadyInvited) {
        await recordActivity({
          type: "MEMBER_INVITED",
          actorId: session.user.id,
          groupId,
          targetUserId: groupMember.userId,
          payload: { targetName: getUserDisplayName(groupMember.user) },
        });
      }
      // Re-inviting resends the same link (the token is kept)
      const emailSent = inviteLink
        ? await sendMail({
            to: groupMember.user.email,
            subject: `You're invited to "${groupMember.group.name}" on FairShare`,
            text: `${groupMember.inviter?.name || groupMember.inviter?.email || "Someone"} invited you to split expenses in "${groupMember.group.name}".\n\nJoin here:\n${inviteLink}\n\nThe link expires in 7 days.`,
          })
        : false;

      return NextResponse.json({
        message: alreadyInvited ? "Already invited: invitation extended" : "User invited successfully",
        alreadyInvited,
        isInvitation: true,
        member: {
          id: groupMember.id,
          status: groupMember.status,
          role: groupMember.role,
          user: {
            id: groupMember.user.id,
            email: groupMember.user.email,
            displayName: getUserDisplayName(groupMember.user),
            isGhost: isGhostUser(groupMember.user),
          },
          inviteLink,
        },
        emailSent,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("already")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error; // Re-throw for general error handling
    }
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

