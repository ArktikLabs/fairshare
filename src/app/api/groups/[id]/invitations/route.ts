import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserDisplayName, isGhostUser } from "@/lib/ghost-users";

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

  return member;
}

// GET /api/groups/[id]/invitations - Get pending invitations for a group
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

    // Validate admin access
    await validateGroupAdminAccess(session.user.id, groupId);

    // Get pending invitations (invited members who haven't joined yet)
    const invitations = await prisma.groupMember.findMany({
      where: {
        groupId,
        status: "INVITED", // Only get invited members
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            displayName: true,
            status: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform response to match expected format
    const transformedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.user.email,
      role: invitation.role,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      inviteLink: invitation.inviteToken
        ? `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invite/${invitation.inviteToken}`
        : null,
      user: {
        ...invitation.user,
        displayName: getUserDisplayName(invitation.user),
        isGhost: isGhostUser(invitation.user),
      },
      inviter: invitation.inviter,
    }));

    return NextResponse.json(transformedInvitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);

    if (error instanceof Error && error.message.includes("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/groups/[id]/invitations - Cancel an invitation
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
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId"); // Now using memberId instead of invitationId

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Validate admin access
    await validateGroupAdminAccess(session.user.id, groupId);

    // Find the invited member
    const member = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId,
        status: "INVITED",
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Invitation not found or already processed" },
        { status: 404 }
      );
    }

    // Cancel the invitation by updating status
    await prisma.groupMember.update({
      where: { id: memberId },
      data: {
        status: "REMOVED",
        leftAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Invitation cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling invitation:", error);

    if (error instanceof Error) {
      if (error.message.includes("Access denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("Permission denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
