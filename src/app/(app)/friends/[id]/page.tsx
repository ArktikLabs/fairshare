import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Plus, Receipt } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadFriends } from "@/lib/friends";
import { loadGroupSettlements, loadPaymentHistory } from "@/lib/group-ledger";
import { expenseListInclude, involvedWhere, serializeExpense } from "@/lib/expense-serialize";
import { reminderCooldowns } from "@/lib/reminders";
import { formatDate } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Card, CardHeader, EmptyState, Money, PageHeader } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/ui/category-icon";
import { BalanceLabel, ExpenseShare } from "@/components/money-bits";
import { PaymentsCard, SettleUpCard } from "@/components/group/settle-up";
import { StartDirect } from "@/components/friends/start-direct";

export const dynamic = "force-dynamic";
export const metadata = { title: "Friend · FairShare" };

const back = (
  <Link href="/friends" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
    <ChevronLeft className="size-4" aria-hidden /> Friends
  </Link>
);

export default async function FriendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/friends/${id}`);
  const userId = session.user.id;
  if (id === userId) notFound();
  const [friend] = await loadFriends(userId, id);
  if (!friend) notFound();

  const direct = friend.directGroupId;
  const groupIds = [...(direct ? [direct] : []), ...friend.sharedGroups.map((g) => g.id)];
  const [ledger, history, cooldowns, expensesRaw] = await Promise.all([
    direct ? loadGroupSettlements(direct) : Promise.resolve(null),
    direct ? loadPaymentHistory(direct, 30, { viewerId: userId, isAdmin: true, archived: false }) : Promise.resolve([]),
    direct ? reminderCooldowns(direct) : Promise.resolve({}),
    groupIds.length
      ? prisma.expense.findMany({
          where: { isDeleted: false, groupId: { in: groupIds }, AND: [involvedWhere(userId), involvedWhere(id)] },
          include: expenseListInclude,
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: 30,
        })
      : Promise.resolve([]),
  ]);
  const expenses = expensesRaw.map((e) => serializeExpense(e, userId, new Set(direct ? [direct] : [])));
  const directCurrency = ledger?.currency ?? "USD";

  return (
    <>
      <PageHeader
        back={back}
        title={
          <span className="inline-flex items-center gap-3">
            <Avatar name={friend.name} className="size-9" /> <span className="min-w-0 truncate">{friend.name}</span>
          </span>
        }
        description={
          <>
            {friend.email}
            {friend.isGhost && (
              <>
                {" "}
                <Badge tone="warning">Invited, no account yet</Badge>
              </>
            )}
          </>
        }
        actions={
          direct ? (
            <ButtonLink href={`/friends/${id}/expenses/create`}>
              <Plus /> Add expense
            </ButtonLink>
          ) : undefined
        }
      />

      <section aria-label="Balance" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(friend.balances.length ? friend.balances : [{ currency: directCurrency, net: 0 }]).map((b) => {
          const c = Math.round(b.net * 100);
          return (
            <Card key={b.currency} className={c > 0 ? "border-emerald-200 bg-emerald-50" : c < 0 ? "border-rose-200 bg-rose-50" : undefined}>
              <div className="px-4 py-3">
                <p className="text-sm text-slate-700">
                  {c > 0 ? `${friend.name} owes you` : c < 0 ? `You owe ${friend.name}` : "All settled up"}
                  <span className="text-slate-500"> · {b.currency}, all shared</span>
                </p>
                {c !== 0 && <Money amount={b.net} currency={b.currency} absolute className="text-xl font-semibold" />}
              </div>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          {direct && ledger ? (
            <SettleUpCard groupId={direct} currency={ledger.currency} ledger={ledger} currentUserId={userId} isAdmin={false} reminderCooldowns={cooldowns} />
          ) : (
            <StartDirect friendId={id} name={friend.name} />
          )}

          <Card>
            <CardHeader title="Shared expenses" description="Just the two of you, and group expenses you are both on" />
            {expenses.length === 0 ? (
              <EmptyState
                icon={<Receipt />}
                title="Nothing shared yet"
                action={
                  direct ? (
                    <ButtonLink href={`/friends/${id}/expenses/create`} size="sm">
                      <Plus /> Add expense
                    </ButtonLink>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <li key={e.id} className="relative flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                    <CategoryIcon category={e.category} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words text-sm font-medium text-slate-900 sm:truncate">
                        <Link
                          href={`/expenses/${e.id}`}
                          className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-500"
                        >
                          {e.description}
                        </Link>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {e.group && e.group.id !== direct ? (
                          <>
                            <Link href={e.group.href} className="relative z-10 hover:underline">
                              {e.group.name}
                            </Link>
                            {" · "}
                          </>
                        ) : null}
                        {formatDate(e.date)}
                      </p>
                    </div>
                    <ExpenseShare expense={e} currency={e.group?.currency ?? "USD"} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-2">
          {friend.sharedGroups.length > 0 && (
            <Card>
              <CardHeader title="Groups you share" />
              <ul className="divide-y divide-slate-100">
                {friend.sharedGroups.map((g) => (
                  <li key={g.id}>
                    <Link href={`/groups/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{g.name}</span>
                      <BalanceLabel net={g.net} currency={g.currency} />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 sm:px-5">Settle group balances on each group&apos;s page.</p>
            </Card>
          )}
          {direct && history.length > 0 && <PaymentsCard groupId={direct} history={history} currency={directCurrency} currentUserId={userId} />}
        </div>
      </div>
    </>
  );
}
