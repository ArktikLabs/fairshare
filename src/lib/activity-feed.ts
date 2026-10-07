import { loadActivity } from "./activity";
import { describeActivity } from "./activity-format";
import type { FeedItem } from "@/components/activity/activity-feed";

/** First page of the feed, ready for <ActivityFeed>. */
export async function loadFeedPage(viewerId: string, groupId?: string, limit = 30): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const page = await loadActivity({ viewerId, groupId, limit });
  return {
    items: page.items.map((a) => ({
      id: a.id,
      type: a.type,
      groupId: a.groupId,
      expenseId: a.expenseId,
      settlementId: a.settlementId,
      createdAt: a.createdAt,
      line: describeActivity(a, viewerId, { showGroup: !groupId }),
    })),
    nextCursor: page.nextCursor,
  };
}
