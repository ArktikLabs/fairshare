import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDirectGroup, loadFriends } from "@/lib/friends";
import { recordActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/friends/[id] - one friend with balances
export async function GET(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [friend] = await loadFriends(session.user.id, id);
  if (!friend) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(friend);
}

// POST /api/friends/[id] - start a 1:1 balance with someone you share a group with
export async function POST(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  if (id === userId) return NextResponse.json({ error: "That is you" }, { status: 400 });
  // Only people you already share an active group with (others: add by email)
  const shared = await prisma.group.findFirst({
    where: {
      isActive: true,
      AND: [
        { members: { some: { userId, status: "ACTIVE" } } },
        { members: { some: { userId: id, status: { in: ["ACTIVE", "INVITED"] } } } },
      ],
    },
    select: { id: true },
  });
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prefs = await prisma.userPreferences.findUnique({ where: { userId }, select: { currency: true } });
  const { group, created } = await ensureDirectGroup(userId, id, prefs?.currency || "USD");
  if (created) {
    const u = await prisma.user.findUnique({ where: { id }, select: { name: true, displayName: true, email: true } });
    await recordActivity({ type: "FRIEND_ADDED", actorId: userId, groupId: group.id, targetUserId: id, payload: { targetName: u?.name || u?.displayName || u?.email } });
  }
  return NextResponse.json({ groupId: group.id, created }, { status: created ? 201 : 200 });
}
