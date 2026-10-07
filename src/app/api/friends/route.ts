import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addFriendByEmail, loadFriends } from "@/lib/friends";
import { appUrl, sendMail } from "@/lib/mailer";

// GET /api/friends - friends with net balance per currency
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await loadFriends(session.user.id));
}

const Body = z.object({ email: z.string().trim().email().max(254) });

// POST /api/friends { email } - add a friend (invites them if they have no account)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  try {
    const { friend, created } = await addFriendByEmail(session.user.id, parsed.data.email);
    let invited = false;
    if (created && friend.status === "GHOST") {
      // No account yet: tell them who added them and how to join
      const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });
      const who = me?.name || me?.email || "Someone";
      invited = await sendMail({
        to: friend.email,
        subject: `${who} added you on FairShare`,
        text: `${who} added you as a friend on FairShare to split expenses.\n\nCreate your free account with this email address to see what you share:\n${appUrl(`/auth/register?email=${encodeURIComponent(friend.email)}`)}\n\nIf you do not know ${who}, you can ignore this email.`,
      });
    }
    return NextResponse.json(
      { id: friend.id, created, invited, isGhost: friend.status === "GHOST" },
      { status: created ? 201 : 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not add friend";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
