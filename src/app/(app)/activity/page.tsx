import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/auth";
import { loadFeedPage } from "@/lib/activity-feed";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ActivityFeed } from "@/components/activity/activity-feed";

export const metadata = { title: "Activity · FairShare" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/activity");
  const { items, nextCursor } = await loadFeedPage(session.user.id);
  return (
    <>
      <PageHeader title="Activity" description="What changed in your groups, newest first" />
      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon={<Activity />}
            title="Nothing yet"
            description="New expenses, edits, payments and comments in your groups show up here."
          />
        ) : (
          <ActivityFeed initial={items} nextCursor={nextCursor} />
        )}
      </Card>
    </>
  );
}
