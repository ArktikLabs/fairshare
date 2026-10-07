import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { csvResponseHeaders, groupCsv } from "@/lib/export";

// GET /api/groups/[id]/export.csv - members only
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const out = await groupCsv(id, session.user.id);
  if (!out) return NextResponse.json({ error: "Access denied: Not a member of this group" }, { status: 403 });
  return new NextResponse(out.body, { headers: csvResponseHeaders(out.filename) });
}
