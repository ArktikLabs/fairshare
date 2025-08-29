import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGroupInvitations, cancelInvitation } from "@/lib/invitation-utils";

// Helper function to validate group admin access
async function validateGroupAdminAccess(userId: string, groupId: string) {
  const { prisma } = await import("@/lib/prisma");
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

    const invitations = await getGroupInvitations(groupId);

    return NextResponse.json(invitations);
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
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Validate admin access
    await validateGroupAdminAccess(session.user.id, groupId);

    await cancelInvitation(invitationId, session.user.id);

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
