import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Plus, Users } from "lucide-react";
import { auth } from "@/auth";
import { loadUserOverview, type GroupPosition } from "@/lib/overview";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { BalanceLabel } from "@/components/money-bits";
import { GroupsFriendsTabs } from "@/components/groups-friends-tabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Groups · FairShare" };

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/groups");
  const { groups: all } = await loadUserOverview(session.user.id);
  const groups = all.filter((g) => g.kind === "STANDARD");
  const current = groups.filter((g) => !g.archived);
  const archived = groups.filter((g) => g.archived);

  return (
    <>
      <GroupsFriendsTabs current="groups" />
      <PageHeader
        title="Groups"
        description="Everyone you split with, one group per trip, flat or club."
        actions={
          <ButtonLink href="/groups/create">
            <Plus /> New group
          </ButtonLink>
        }
      />
      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users />}
            title="No groups yet"
            description="Create a group, invite people, then add expenses."
            action={
              <ButtonLink href="/groups/create">
                <Plus /> Create your first group
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {current.length > 0 && <GroupList groups={current} />}
          {archived.length > 0 && (
            <section aria-labelledby="archived-groups">
              <h2 id="archived-groups" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Archive className="size-4" aria-hidden /> Archived
              </h2>
              <GroupList groups={archived} />
            </section>
          )}
        </div>
      )}
    </>
  );
}

function GroupList({ groups }: { groups: GroupPosition[] }) {
  return (
    <Card>
      <ul className="divide-y divide-slate-100">
        {groups.map((g) => (
          <li key={g.id}>
            <Link href={`/groups/${g.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5">
              <span
                className={
                  "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold " +
                  (g.archived ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-700")
                }
              >
                {g.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <span className="truncate">{g.name}</span>
                  {g.myStatus === "INVITED" && <Badge tone="warning">Invited</Badge>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {g.currency} · {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                  {g.invitedCount > 0 && ` · ${g.invitedCount} invited`} · {g.expenseCount}{" "}
                  {g.expenseCount === 1 ? "expense" : "expenses"}
                </p>
              </div>
              {g.myStatus === "ACTIVE" ? (
                <BalanceLabel net={g.net} currency={g.currency} />
              ) : (
                <span className="text-xs text-slate-500">Not joined</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
