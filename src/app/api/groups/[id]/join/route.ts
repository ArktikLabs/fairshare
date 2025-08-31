import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/groups/[id]/join - Join a group
export async function POST(
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

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
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
          { error: "You are already a member of this group" },
          { status: 400 }
        );
      } else {
        // Reactivate existing member
        await prisma.groupMember.update({
          where: { id: existingMember.id },
          data: {
            isActive: true,
            role: "MEMBER",
          },
        });

        return NextResponse.redirect(new URL(`/groups/${groupId}`, request.url), 303);
      }
    }

    // Create new member
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: user.id,
        role: "MEMBER",
      },
    });

    // Redirect to the group page
    return NextResponse.redirect(new URL(`/groups/${groupId}`, request.url), 303);
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
