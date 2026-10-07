import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadActivity } from "@/lib/activity";
import { describeActivity } from "@/lib/activity-format";
import { isActiveMember } from "@/lib/group-ledger";

// GET /api/activity?groupId=&limit=&cursor= - Activity in my groups, newest first.
// Each item has a ready-to-show `line` written for the signed-in user.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId") || undefined;
  const limit = parseInt(url.searchParams.get("limit") || "30", 10) || 30;
  const cursor = url.searchParams.get("cursor");
  if (groupId && !(await isActiveMember(groupId, userId))) {
    return NextResponse.json({ error: "Access denied: Not a member of this group" }, { status: 403 });
  }
  try {
    const page = await loadActivity({ viewerId: userId, groupId, limit, cursor });
    return NextResponse.json({
      items: page.items.map((a) => ({ ...a, line: describeActivity(a, userId, { showGroup: !groupId }) })),
      nextCursor: page.nextCursor,
    });
  } catch {
    return NextResponse.json({ error: "Bad cursor" }, { status: 400 });
  }
}
