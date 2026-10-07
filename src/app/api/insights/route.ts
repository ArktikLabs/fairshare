import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadInsights } from "@/lib/insights";

// GET /api/insights?groupId=&from=YYYY-MM-DD&to=YYYY-MM-DD - my share by category and month
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = request.nextUrl.searchParams;
  const data = await loadInsights(session.user.id, { groupId: sp.get("groupId"), from: sp.get("from"), to: sp.get("to") });
  return NextResponse.json(data);
}
