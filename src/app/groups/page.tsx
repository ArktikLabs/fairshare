import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadGroupSettlements } from "@/lib/group-ledger";
import { formatSettlementAmount } from "@/lib/settlement-utils";
import AppHeader from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/groups");
  const userId = session.user.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId, status: { in: ["ACTIVE", "INVITED"] }, group: { isActive: true } },
    include: {
      group: {
        include: {
          _count: {
            select: {
              expenses: { where: { isDeleted: false } },
              members: { where: { status: { in: ["ACTIVE", "INVITED"] } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const groups = await Promise.all(
    memberships.map(async (m) => {
      const ledger = m.status === "ACTIVE" ? await loadGroupSettlements(m.groupId) : null;
      const net = ledger?.balances.find((b) => b.userId === userId)?.netBalance ?? 0;
      return { ...m.group, myStatus: m.status, net };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader active="/groups" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your groups</h1>
          <Link href="/groups/create" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            Create group
          </Link>
        </div>
        {groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
            No groups yet.{" "}
            <Link href="/groups/create" className="text-blue-600 hover:text-blue-800">
              Create your first group
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{g.name}</div>
                    <div className="text-sm text-gray-500">
                      {g._count.members} members • {g._count.expenses} expenses • {g.currency}
                      {g.myStatus === "INVITED" && <span className="text-amber-600"> • invitation pending</span>}
                    </div>
                  </div>
                  {g.myStatus === "ACTIVE" && (
                    <div
                      className={`font-semibold ${
                        g.net > 0 ? "text-green-600" : g.net < 0 ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      {g.net === 0 ? "settled" : `${g.net > 0 ? "+" : ""}${formatSettlementAmount(g.net, g.currency)}`}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
