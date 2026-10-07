import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrency } from "@/lib/currencies";
import { getRate } from "@/lib/fx-rates";
import { isDay } from "@/lib/recurrence";

// GET /api/fx/rate?from=USD&to=IDR&date=YYYY-MM-DD -> { rate, day, source }
// 404 when no free source has the pair (the form then asks for a manual rate).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const from = (url.searchParams.get("from") ?? "").toUpperCase();
  const to = (url.searchParams.get("to") ?? "").toUpperCase();
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!getCurrency(from) || !getCurrency(to) || !isDay(date)) {
    return NextResponse.json({ error: "Use from, to (ISO currency codes) and date (YYYY-MM-DD)" }, { status: 400 });
  }
  const r = await getRate(from, to, date);
  if (!r) return NextResponse.json({ error: "No rate available" }, { status: 404 });
  return NextResponse.json(r, { headers: { "Cache-Control": "private, max-age=3600" } });
}
