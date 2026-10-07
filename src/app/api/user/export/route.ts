import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expenseListInclude, involvedWhere, serializeExpense } from "@/lib/expense-serialize";

// POST /api/user/export - Download everything FairShare stores about the
// signed-in user as JSON: profile, preferences, group memberships, the
// expenses they are on and the payments they made or received.
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [user, preferences, memberships, expenses, payments, passkeys] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
      }),
      prisma.userPreferences.findUnique({
        where: { userId },
        select: { currency: true, timezone: true, theme: true },
      }),
      prisma.groupMember.findMany({
        where: { userId },
        select: {
          role: true,
          status: true,
          joinedAt: true,
          leftAt: true,
          group: { select: { id: true, name: true, description: true, currency: true, createdAt: true } },
        },
      }),
      prisma.expense.findMany({
        where: { isDeleted: false, ...involvedWhere(userId) },
        include: expenseListInclude,
        orderBy: { date: "desc" },
      }),
      prisma.settlement.findMany({
        where: { OR: [{ payerId: userId }, { payeeId: userId }] },
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          description: true,
          createdAt: true,
          groupId: true,
          payer: { select: { id: true, name: true, email: true } },
          payee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.authenticator.count({ where: { userId } }),
    ]);

    const body = {
      exportedAt: new Date().toISOString(),
      user,
      preferences,
      passkeys,
      groups: memberships,
      expenses: expenses.map((e) => {
        const s = serializeExpense(e, userId, new Set());
        return {
          id: s.id,
          description: s.description,
          amount: s.amount,
          currency: s.group?.currency ?? null,
          category: s.category,
          date: s.date,
          notes: s.notes,
          group: s.group ? { id: s.group.id, name: s.group.name } : null,
          payers: s.payers.map((p) => ({ name: p.user.name || p.user.email, amount: p.amount })),
          splits: s.splits.map((p) => ({ name: p.user.name || p.user.email, amount: p.amount })),
          mine: s.my,
        };
      }),
      payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(body, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="fairshare-export-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Data export error", {
      route: "/api/user/export",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
