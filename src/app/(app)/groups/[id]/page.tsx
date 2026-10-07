import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Plus, Receipt, Settings } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadGroupSettlements, loadPaymentHistory } from "@/lib/group-ledger";
import { expenseListInclude, serializeExpense } from "@/lib/expense-serialize";
import { appUrl } from "@/lib/mailer";
import { formatDate } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, CardHeader, EmptyState, Money, PageHeader } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ExpenseShare } from "@/components/money-bits";
import { BalancesCard, PaymentsCard, SettleUpCard } from "@/components/group/settle-up";
import { MembersCard, type MemberRow } from "@/components/group/members-card";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { loadFeedPage } from "@/lib/activity-feed";
import { reminderCooldowns } from "@/lib/reminders";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const g = await prisma.group.findUnique({ where: { id }, select: { name: true } });
  return { title: g ? `${g.name} · FairShare` : "Group · FairShare" };
}

const back = (
  <Link href="/groups" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
    <ChevronLeft className="size-4" aria-hidden /> Groups
  </Link>
);

export default async function GroupDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/groups/${id}`);
  const userId = session.user.id;

  const group = await prisma.group.findFirst({
    where: { id, isActive: true, members: { some: { userId, status: { in: ["ACTIVE", "INVITED"] } } } },
    include: {
      members: {
        where: { status: { in: ["ACTIVE", "INVITED"] } },
        include: { user: { select: { id: true, name: true, email: true, displayName: true } } },
        orderBy: [{ status: "asc" }, { role: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!group) notFound();
  if (group.kind === "DIRECT") {
    const other = group.members.find((m) => m.userId !== userId);
    redirect(other ? `/friends/${other.userId}` : "/friends");
  }

  const me = group.members.find((m) => m.userId === userId)!;
  const isPendingInvite = me.status === "INVITED";
  const isAdmin = me.status === "ACTIVE" && (me.role === "ADMIN" || me.role === "OWNER");

  if (isPendingInvite) {
    const inviter = me.invitedBy
      ? await prisma.user.findUnique({ where: { id: me.invitedBy }, select: { name: true, email: true } })
      : null;
    return (
      <>
        <PageHeader back={back} title={group.name} description={group.description || undefined} />
        <Card className="max-w-xl p-5">
          <p className="text-sm text-slate-700">
            {inviter ? (inviter.name || inviter.email) + " invited you" : "You were invited"} to split expenses in{" "}
            <span className="font-medium">{group.name}</span>. Join to see balances and add expenses.
          </p>
          <div className="mt-4">
            {me.inviteToken ? (
              <ButtonLink href={`/invite/${me.inviteToken}`}>Review invite</ButtonLink>
            ) : (
              <Alert tone="warning">This invite has expired. Ask a group admin to invite you again.</Alert>
            )}
          </div>
        </Card>
      </>
    );
  }

  const archived = Boolean(group.archivedAt);
  const [ledger, history, expensesRaw, expenseCount, feed, cooldowns] = await Promise.all([
    loadGroupSettlements(group.id),
    loadPaymentHistory(group.id, 50, { viewerId: userId, isAdmin, archived }),
    prisma.expense.findMany({
      where: { groupId: group.id, isDeleted: false },
      include: expenseListInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.expense.count({ where: { groupId: group.id, isDeleted: false } }),
    loadFeedPage(userId, group.id, 8),
    reminderCooldowns(group.id),
  ]);
  if (!ledger) notFound();
  const adminSet = new Set(isAdmin ? [group.id] : []);
  const expenses = expensesRaw.map((e) => serializeExpense(e, userId, adminSet));
  const balanceOf = new Map(ledger.balances.map((b) => [b.userId, b.netBalance]));
  const myNet = balanceOf.get(userId) ?? 0;

  const members: MemberRow[] = group.members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    status: m.status as "ACTIVE" | "INVITED",
    inviteLink: isAdmin && m.status === "INVITED" && m.inviteToken ? appUrl(`/invite/${m.inviteToken}`) : null,
    name: m.user.name || m.user.displayName || m.user.email,
    email: m.user.email,
    balance: m.status === "ACTIVE" ? (balanceOf.get(m.userId) ?? 0) : null,
  }));
  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const myCents = Math.round(myNet * 100);

  return (
    <>
      <PageHeader
        back={back}
        title={group.name}
        description={
          <>
            {group.description ? <>{group.description} · </> : null}
            {group.currency} · {activeCount} {activeCount === 1 ? "member" : "members"}
            {members.length > activeCount ? ` · ${members.length - activeCount} invited` : null}
          </>
        }
        actions={
          <>
            <ButtonLink href={`/groups/${group.id}/settings`} variant="secondary" aria-label="Group settings">
              <Settings /> <span className="hidden sm:inline">Settings</span>
            </ButtonLink>
            {!archived && (
              <ButtonLink href={`/groups/${group.id}/expenses/create`}>
                <Plus /> Add expense
              </ButtonLink>
            )}
          </>
        }
      />

      {archived && (
        <Alert tone="info" className="mb-5">
          <span className="font-medium">Archived.</span> This group is read-only: no new expenses, edits or payments.{" "}
          {isAdmin ? (
            <Link href={`/groups/${group.id}/settings`} className="font-medium underline">
              Unarchive in settings
            </Link>
          ) : (
            "An admin can unarchive it."
          )}
        </Alert>
      )}

      {(expenseCount > 0 || history.length > 0) && (
      <div
        className={
          "mb-5 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border px-4 py-3 sm:px-5 " +
          (myCents > 0
            ? "border-emerald-200 bg-emerald-50"
            : myCents < 0
              ? "border-rose-200 bg-rose-50"
              : "border-slate-200 bg-white")
        }
      >
        <p className="text-sm text-slate-700">
          {myCents > 0 ? "You are owed in this group" : myCents < 0 ? "You owe in this group" : "You are settled up in this group"}
        </p>
        {myCents !== 0 && <Money amount={myNet} currency={group.currency} absolute className="text-xl font-semibold" />}
      </div>
      )}

      <div className="grid gap-5 lg:grid-cols-5 [&>*]:min-w-0">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <SettleUpCard
            groupId={group.id}
            currency={group.currency}
            ledger={ledger}
            currentUserId={userId}
            isAdmin={isAdmin}
            readOnly={archived}
            reminderCooldowns={cooldowns}
          />
          <Card>
            <CardHeader
              title="Recent expenses"
              description={`${expenseCount} total`}
              action={
                expenseCount > 0 ? (
                  <Link href={`/groups/${group.id}/expenses`} className="text-sm font-medium text-brand-700 hover:underline">
                    View all
                  </Link>
                ) : null
              }
            />
            {expenses.length === 0 ? (
              <EmptyState
                icon={<Receipt />}
                title="No expenses yet"
                description={archived ? "This group is archived." : "Add the first one and FairShare works out who owes whom."}
                action={
                  archived ? undefined : (
                    <ButtonLink href={`/groups/${group.id}/expenses/create`} size="sm">
                      <Plus /> Add expense
                    </ButtonLink>
                  )
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {expenses.map((e) => {
                  const payer =
                    e.payers.length === 1
                      ? e.payers[0].userId === userId
                        ? "You"
                        : e.payers[0].user.name || e.payers[0].user.email
                      : `${e.payers.length} people`;
                  return (
                    <li key={e.id}>
                      <Link href={`/expenses/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                        <CategoryIcon category={e.category} />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 break-words text-sm font-medium text-slate-900 sm:truncate">{e.description}</p>
                          <p className="truncate text-xs text-slate-500">
                            {payer} paid · {formatDate(e.date)}
                          </p>
                        </div>
                        <ExpenseShare expense={e} currency={group.currency} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <PaymentsCard groupId={group.id} history={history} currency={group.currency} currentUserId={userId} />
        </div>
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <BalancesCard ledger={ledger} currency={group.currency} currentUserId={userId} />
          <MembersCard
            groupId={group.id}
            groupName={group.name}
            currency={group.currency}
            members={members}
            currentUserId={userId}
            isAdmin={isAdmin && !archived}
          />
          <Card id="activity" className="scroll-mt-20">
            <CardHeader title="Activity" description="Recent changes in this group" />
            {feed.items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500 sm:px-5">Nothing recorded yet.</p>
            ) : (
              <ActivityFeed initial={feed.items} nextCursor={feed.nextCursor} groupId={group.id} />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
