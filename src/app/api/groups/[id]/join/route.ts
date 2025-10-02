import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { acceptGroupInvitation } from "@/lib/ghost-users";

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
      // Accept invitation using Ghost Users system
      const updatedMember = await acceptGroupInvitation(inviteToken, session.user.id);

      // Verify the group ID matches
      if (updatedMember.group.id !== groupId) {
        return NextResponse.json(
          { error: "Group ID mismatch" },
          { status: 400 }
        );
      }

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
