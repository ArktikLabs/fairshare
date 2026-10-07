import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Plus, Receipt, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadUserOverview } from "@/lib/overview";
import { expenseListInclude, serializeExpense } from "@/lib/expense-serialize";
import { formatDate } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardBody, CardHeader, EmptyState, Money, PageHeader } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/ui/category-icon";
import { BalanceLabel, ExpenseShare } from "@/components/money-bits";

export const metadata = { title: "Dashboard · FairShare" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/dashboard");
  const userId = session.user.id;

  const [user, overview] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    loadUserOverview(userId),
  ]);
  const active = overview.groups.filter((g) => g.myStatus === "ACTIVE");
  const pendingInvites = overview.groups.filter((g) => g.myStatus === "INVITED");
  const activeIds = active.map((g) => g.id);

  const recentRaw = activeIds.length
    ? await prisma.expense.findMany({
        where: { isDeleted: false, groupId: { in: activeIds } },
        include: expenseListInclude,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 6,
      })
    : [];
  const recent = recentRaw.map((e) => serializeExpense(e, userId, new Set()));

  const firstName = (user?.name || "").trim().split(/\s+/)[0];
  const isNew = active.length === 0 || (recent.length === 0 && active.every((g) => g.expenseCount === 0));
  const greeting = isNew
    ? firstName
      ? `Welcome to FairShare, ${firstName}`
      : "Welcome to FairShare"
    : firstName
      ? `Hi, ${firstName}`
      : "Dashboard";

  const currencies = Object.keys(overview.totals).sort();
  const owes = active.flatMap((g) => g.owes.map((s) => ({ ...s, groupId: g.id, groupName: g.name })));
  const owed = active.flatMap((g) => g.owed.map((s) => ({ ...s, groupId: g.id, groupName: g.name })));

  return (
    <>
      <PageHeader
        title={greeting}
        description={isNew ? "Three steps and you are splitting bills." : "Where you stand across all your groups."}
      />

      {pendingInvites.length > 0 && (
        <Card className="mb-5 border-brand-200 bg-brand-50/50">
          <CardBody className="space-y-2">
            {pendingInvites.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-800">
                  You were invited to <span className="font-medium">{g.name}</span>
                </p>
                <ButtonLink href={`/groups/${g.id}`} size="sm" variant="secondary">
                  View invite
                </ButtonLink>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {isNew ? (
        <FirstRunChecklist groups={active} />
      ) : (
        <div className="space-y-5">
          <section aria-label="Totals" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currencies.map((c) => {
              const t = overview.totals[c];
              return (
                <Card key={c}>
                  <CardBody className="py-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c} net</p>
                      <Badge tone={t.net > 0 ? "positive" : t.net < 0 ? "negative" : "neutral"}>
                        {t.net > 0 ? "You are owed" : t.net < 0 ? "You owe" : "All settled"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-2xl font-semibold">
                      <Money amount={t.net} currency={c} signed />
                    </p>
                    <dl className="mt-2 flex gap-4 text-xs text-slate-500">
                      <div>
                        <dt className="inline">You owe </dt>
                        <dd className="inline font-medium text-slate-800">
                          <Money amount={t.owe} currency={c} />
                        </dd>
                      </div>
                      <div>
                        <dt className="inline">Owed to you </dt>
                        <dd className="inline font-medium text-slate-800">
                          <Money amount={t.owed} currency={c} />
                        </dd>
                      </div>
                    </dl>
                  </CardBody>
                </Card>
              );
            })}
          </section>

          <div className="grid gap-5 lg:grid-cols-5">
            <div className="space-y-5 lg:col-span-3">
              <Card>
                <CardHeader
                  title="Recent expenses"
                  action={
                    <Link href="/expenses" className="text-sm font-medium text-brand-700 hover:underline">
                      View all
                    </Link>
                  }
                />
                {recent.length === 0 ? (
                  <EmptyState
                    icon={<Receipt />}
                    title="No expenses yet"
                    action={<ButtonLink href="/expenses/create" size="sm"><Plus /> Add expense</ButtonLink>}
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recent.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <CategoryIcon category={e.category} />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 break-words text-sm font-medium text-slate-900 sm:truncate">{e.description}</p>
                          <p className="truncate text-xs text-slate-500">
                            {e.group && (
                              <Link href={`/groups/${e.group.id}`} className="hover:underline">
                                {e.group.name}
                              </Link>
                            )}
                            {" · "}
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

            <div className="space-y-5 lg:col-span-2">
              <Card>
                <CardHeader
                  title="Settle up"
                  description="Fewest payments to clear every balance"
                  action={
                    <Link href="/settlements" className="text-sm font-medium text-brand-700 hover:underline">
                      Open
                    </Link>
                  }
                />
                {owes.length + owed.length === 0 ? (
                  <EmptyState icon={<Check />} title="You are all settled up" className="py-6" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {owes.map((s) => (
                      <li key={`o-${s.groupId}-${s.toUserId}`}>
                        <Link
                          href={`/groups/${s.groupId}#settle`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-900">
                              You pay <span className="font-medium">{s.toUserName}</span>
                            </p>
                            <p className="truncate text-xs text-slate-500">{s.groupName}</p>
                          </div>
                          <Money amount={-s.amount} currency={s.currency} absolute className="text-sm font-semibold" />
                          <ArrowRight className="size-4 text-slate-400" aria-hidden />
                        </Link>
                      </li>
                    ))}
                    {owed.map((s) => (
                      <li key={`i-${s.groupId}-${s.fromUserId}`}>
                        <Link
                          href={`/groups/${s.groupId}#settle`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-slate-900">
                              <span className="font-medium">{s.fromUserName}</span> pays you
                            </p>
                            <p className="truncate text-xs text-slate-500">{s.groupName}</p>
                          </div>
                          <Money amount={s.amount} currency={s.currency} absolute className="text-sm font-semibold" />
                          <ArrowRight className="size-4 text-slate-400" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Your groups"
                  action={
                    <Link href="/groups" className="text-sm font-medium text-brand-700 hover:underline">
                      All groups
                    </Link>
                  }
                />
                <ul className="divide-y divide-slate-100">
                  {active.slice(0, 6).map((g) => (
                    <li key={g.id}>
                      <Link href={`/groups/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{g.name}</p>
                          <p className="text-xs text-slate-500">
                            {g.memberCount} {g.memberCount === 1 ? "member" : "members"} · {g.expenseCount}{" "}
                            {g.expenseCount === 1 ? "expense" : "expenses"}
                          </p>
                        </div>
                        <BalanceLabel net={g.net} currency={g.currency} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FirstRunChecklist({
  groups,
}: {
  groups: Array<{ id: string; name: string; memberCount: number; invitedCount: number }>;
}) {
  const first = groups[0];
  const hasGroup = groups.length > 0;
  const hasOthers = groups.some((g) => g.memberCount + g.invitedCount > 1);
  const steps = [
    {
      done: hasGroup,
      title: "Create a group",
      text: "A trip, a flat, a dinner club: one group per set of people.",
      action: <ButtonLink href="/groups/create" size="sm"><Users /> Create group</ButtonLink>,
    },
    {
      done: hasOthers,
      title: "Invite people",
      text: "Invite by email or share a link. They can be added to expenses before they join.",
      action: first ? (
        <ButtonLink href={`/groups/${first.id}#members`} size="sm" variant={hasGroup ? "primary" : "secondary"}>
          Invite to {first.name}
        </ButtonLink>
      ) : null,
    },
    {
      done: false,
      title: "Add your first expense",
      text: "Say who paid and how to split it. FairShare keeps the running balance.",
      action: first ? (
        <ButtonLink href={`/groups/${first.id}/expenses/create`} size="sm" variant={hasOthers ? "primary" : "secondary"}>
          <Plus /> Add expense
        </ButtonLink>
      ) : null,
    },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <Card className="max-w-2xl">
      <CardHeader title="Get started" description={`${steps.filter((s) => s.done).length} of 3 done`} />
      <ol className="divide-y divide-slate-100">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 px-4 py-4 sm:px-5">
            <span
              className={
                s.done
                  ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
                  : i === current
                    ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white"
                    : "flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500"
              }
            >
              {s.done ? <Check className="size-4" aria-label="Done" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={s.done ? "text-sm font-medium text-slate-500 line-through" : "text-sm font-medium text-slate-900"}>
                {s.title}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{s.text}</p>
              {!s.done && i === current && s.action && <div className="mt-3">{s.action}</div>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
