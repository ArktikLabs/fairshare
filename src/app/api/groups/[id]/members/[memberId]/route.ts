import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { loadGroupSettlements } from "@/lib/group-ledger";

const UpdateMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function requireAdmin(userId: string, groupId: string) {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN"] },
      group: { isActive: true },
    },
  });
  if (!member) throw new HttpError(403, "Access denied: Admin privileges required");
  return member;
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// PATCH /api/groups/[id]/members/[memberId] - Change a member's role (admins only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: groupId, memberId } = await params;
    await requireAdmin(session.user.id, groupId);

    const { role } = UpdateMemberSchema.parse(await request.json());

    const member = await prisma.groupMember.findFirst({
      where: { id: memberId, groupId, status: "ACTIVE" },
    });
    if (!member) throw new HttpError(404, "Member not found");
    if (member.userId === session.user.id) throw new HttpError(400, "Cannot change your own role");
    if (member.role === "OWNER") throw new HttpError(400, "The group owner's role cannot be changed");

    const updatedMember = await prisma.groupMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updatedMember);
  } catch (error) {
    return errorResponse(error, "Error updating member:");
  }
}

// Kept for API compatibility with older clients
export const PUT = PATCH;

// DELETE /api/groups/[id]/members/[memberId]
// Admins can remove a member or cancel a pending invite; any member can leave
// (memberId of their own membership). People with an open balance stay until
// they are settled up, so nobody's money disappears from the group.
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

    const member = await prisma.groupMember.findFirst({
      where: { id: memberId, groupId, status: { in: ["ACTIVE", "INVITED"] } },
    });
    if (!member) throw new HttpError(404, "Member not found");

    const isSelf = member.userId === session.user.id;
    if (!isSelf) await requireAdmin(session.user.id, groupId);

    if (member.status === "INVITED" && !isSelf) {
      // Cancelling an invite: allowed only when the invitee has nothing on the books
      const ledger = await loadGroupSettlements(groupId);
      const balance = ledger?.balances.find((b) => b.userId === member.userId);
      if (balance && (balance.totalPaid !== 0 || balance.totalOwed !== 0)) {
        throw new HttpError(
          400,
          "This person is already on expenses in the group. Edit or delete those expenses first."
        );
      }
      await prisma.groupMember.update({
        where: { id: memberId },
        data: { status: "REMOVED", leftAt: new Date(), inviteToken: null, expiresAt: null },
      });
      return NextResponse.json({ message: "Invitation cancelled" });
    }

    if (member.role === "ADMIN" || member.role === "OWNER") {
      const admins = await prisma.groupMember.count({
        where: { groupId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
      });
      if (admins <= 1) {
        throw new HttpError(400, "The last admin cannot leave. Make someone else admin first.");
      }
    }

    const ledger = await loadGroupSettlements(groupId);
    const balance = ledger?.balances.find((b) => b.userId === member.userId);
    if (balance && balance.netBalance !== 0) {
      throw new HttpError(400, "Settle up first: this member still has an open balance in the group");
    }

    await prisma.groupMember.update({
      where: { id: memberId },
      data: { status: isSelf ? "LEFT" : "REMOVED", leftAt: new Date() },
    });
    return NextResponse.json({ message: isSelf ? "You left the group" : "Member removed successfully" });
  } catch (error) {
    return errorResponse(error, "Error removing member:");
  }
}
