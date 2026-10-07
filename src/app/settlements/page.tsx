import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadGroupSettlements } from "@/lib/group-ledger";
import { formatSettlementAmount } from "@/lib/settlement-utils";
import AppHeader from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settlements");
  const userId = session.user.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId, status: "ACTIVE", group: { isActive: true } },
    select: { group: { select: { id: true, name: true, currency: true } } },
    orderBy: { group: { name: "asc" } },
  });

  const rows = [];
  for (const { group } of memberships) {
    const ledger = await loadGroupSettlements(group.id);
    if (!ledger) continue;
    const net = ledger.balances.find((b) => b.userId === userId)?.netBalance ?? 0;
    const mine = ledger.suggestedSettlements.filter(
      (s) => s.fromUserId === userId || s.toUserId === userId
    );
    rows.push({ group, net, mine });
  }
  const open = rows.filter((r) => r.mine.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader active="/settlements" />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settle up</h1>
          <p className="text-gray-600">What you owe and are owed across all your groups.</p>
        </div>

        {open.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-medium text-green-600">You are all settled up</p>
            <p className="text-sm text-gray-500">No open balances in any of your groups.</p>
          </div>
        ) : (
          open.map(({ group, net, mine }) => (
            <div key={group.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <Link href={`/groups/${group.id}`} className="text-lg font-semibold text-gray-900 hover:underline">
                  {group.name}
                </Link>
                <span className={`font-semibold ${net > 0 ? "text-green-600" : "text-red-600"}`}>
                  {net > 0 ? "+" : ""}
                  {formatSettlementAmount(net, group.currency)}
                </span>
              </div>
              <ul className="space-y-2">
                {mine.map((s) => (
                  <li
                    key={`${s.fromUserId}-${s.toUserId}`}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      s.fromUserId === userId ? "bg-red-50" : "bg-green-50"
                    }`}
                  >
                    <span className="text-gray-900">
                      {s.fromUserId === userId ? `You pay ${s.toUserName}` : `${s.fromUserName} pays you`}
                    </span>
                    <span className="font-semibold">{formatSettlementAmount(s.amount, group.currency)}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/groups/${group.id}`} className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800">
                Record a payment in the group →
              </Link>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
