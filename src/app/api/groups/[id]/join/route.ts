import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { acceptGroupInvitation } from "@/lib/ghost-users";
import { recordActivity } from "@/lib/activity";

// POST /api/groups/[id]/join?token=<inviteToken> - Join a group via invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inviteToken = searchParams.get("token");

    if (!inviteToken) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    const { id: groupId } = await params;

    try {
      // Check the token belongs to this group BEFORE accepting it, so a
      // mismatched URL cannot join the user and then report an error.
      const invited = await prisma.groupMember.findFirst({ where: { inviteToken }, select: { groupId: true } });
      if (invited && invited.groupId !== groupId) {
        return NextResponse.json({ error: "Group ID mismatch" }, { status: 400 });
      }

      // Accept invitation using Ghost Users system
      const updatedMember = await acceptGroupInvitation(inviteToken, session.user.id);
      await recordActivity({ type: "MEMBER_JOINED", actorId: session.user.id, groupId: updatedMember.group.id });

      console.log(
        `User ${session.user.id} joined group ${groupId} via invitation`
      );

      // Redirect to the group page
      return NextResponse.redirect(new URL(`/groups/${groupId}`, request.url), 303);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Invalid") || error.message.includes("expired")) {
          return NextResponse.json(
            { error: "Invalid or expired invitation" },
            { status: 400 }
          );
        }
        if (error.message.includes("no longer valid")) {
          return NextResponse.json(
            { error: "Invitation is no longer valid" },
            { status: 400 }
          );
        }
      }
      throw error; // Re-throw for general error handling
    }
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
