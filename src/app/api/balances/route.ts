import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadGroupSettlements } from "@/lib/group-ledger";

// GET /api/balances - The signed-in user's balance in every active group,
// plus the payments they need to make or receive. Totals are per currency
// because groups can use different currencies.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId, status: "ACTIVE", group: { isActive: true } },
      select: { group: { select: { id: true, name: true, currency: true } } },
    });

    const groups = [];
    const totals: Record<string, { owe: number; owed: number; net: number }> = {};

    for (const { group } of memberships) {
      const ledger = await loadGroupSettlements(group.id);
      if (!ledger) continue;
      const mine = ledger.balances.find((b) => b.userId === userId);
      const net = mine?.netBalance ?? 0;
      const owes = ledger.suggestedSettlements.filter((s) => s.fromUserId === userId);
      const owed = ledger.suggestedSettlements.filter((s) => s.toUserId === userId);

      const t = (totals[group.currency] ??= { owe: 0, owed: 0, net: 0 });
      t.owe = Math.round((t.owe + Math.max(0, -net)) * 100) / 100;
      t.owed = Math.round((t.owed + Math.max(0, net)) * 100) / 100;
      t.net = Math.round((t.net + net) * 100) / 100;

      groups.push({ ...group, net, owes, owed });
    }

    return NextResponse.json({ totals, groups });
  } catch (error) {
    console.error("Error loading balances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
