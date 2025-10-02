import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { acceptGroupInvitation } from "@/lib/ghost-users";

// GET /api/invite/[token] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Find invitation by token
    const { prisma } = await import("@/lib/prisma");
    const invitation = await prisma.groupMember.findUnique({
      where: { inviteToken: token },
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
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            currency: true,
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
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      );
    }

    if (invitation.status !== "INVITED") {
      return NextResponse.json(
        { error: "Invitation is no longer valid" },
        { status: 400 }
      );
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Return invitation details without sensitive data
    return NextResponse.json({
      id: invitation.id,
      role: invitation.role,
      user: {
        email: invitation.user.email,
        displayName: invitation.user.displayName || invitation.user.name,
        isGhost: invitation.user.status === 'GHOST',
      },
      group: invitation.group,
      inviter: invitation.inviter,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/invite/[token] - Accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    try {
      const updatedMember = await acceptGroupInvitation(token, session.user.id);

      return NextResponse.json({
        message: "Invitation accepted successfully",
        group: {
          id: updatedMember.group.id,
          name: updatedMember.group.name,
        },
        redirectTo: `/groups/${updatedMember.group.id}`,
      });
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
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}