import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadUserOverview } from "@/lib/overview";

// GET /api/balances - The signed-in user's balance in every active group,
// plus the payments they need to make or receive. Totals are per currency
// because groups can use different currencies. Pending invites are not
// included (the user has not joined those groups yet).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { groups, totals } = await loadUserOverview(session.user.id);
    return NextResponse.json({
      totals,
      groups: groups
        .filter((g) => g.myStatus === "ACTIVE")
        .map((g) => ({ id: g.id, name: g.name, currency: g.currency, net: g.net, owes: g.owes, owed: g.owed })),
    });
  } catch (error) {
    console.error("Error loading balances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
