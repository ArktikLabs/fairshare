import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { loadFriends } from "@/lib/friends";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { BalanceLabel } from "@/components/money-bits";
import { GroupsFriendsTabs } from "@/components/groups-friends-tabs";
import { AddFriend } from "@/components/friends/add-friend";

export const dynamic = "force-dynamic";
export const metadata = { title: "Friends · FairShare" };

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/friends");
  const friends = await loadFriends(session.user.id);

  return (
    <>
      <GroupsFriendsTabs current="friends" />
      <PageHeader title="Friends" description="Split with one person without making a group. Balances include the groups you share." />
      <div className="grid gap-5 lg:grid-cols-5 [&>*]:min-w-0">
        <div className="min-w-0 lg:col-span-3">
          {friends.length === 0 ? (
            <Card>
              <EmptyState
                icon={<UserPlus />}
                title="No friends yet"
                description="Add someone by email to split a dinner or a taxi, just the two of you."
              />
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-slate-100">
                {friends.map((f) => (
                  <li key={f.id}>
                    <Link href={`/friends/${f.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5">
                      <Avatar name={f.name} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                          <span className="truncate">{f.name}</span>
                          {f.isGhost && <Badge tone="warning">Invited</Badge>}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {f.sharedGroups.length > 0
                            ? `${f.sharedGroups.length} shared ${f.sharedGroups.length === 1 ? "group" : "groups"}`
                            : f.email}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {f.balances.length === 0 ? (
                          <BalanceLabel net={0} currency="USD" />
                        ) : (
                          f.balances.map((b) => <BalanceLabel key={b.currency} net={b.net} currency={b.currency} />)
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2">
          <AddFriend />
        </div>
      </div>
    </>
  );
}
