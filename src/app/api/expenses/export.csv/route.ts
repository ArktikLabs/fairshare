import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { csvResponseHeaders, userCsv } from "@/lib/export";

// GET /api/expenses/export.csv - all my expenses with my share
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out = await userCsv(session.user.id);
  return new NextResponse(out.body, { headers: csvResponseHeaders(out.filename) });
}
