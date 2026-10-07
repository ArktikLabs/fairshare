// Exchange rates for multi-currency expenses: free sources without an API
// key, cached per day in ExchangeRate. Frankfurter (ECB reference rates,
// historical by date) first, then open.er-api.com (latest only, wider
// currency list). When both fail the form asks for a manual rate.

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "./prisma";

export interface Rate {
  rate: number;
  /** YYYY-MM-DD the rate applies to */
  day: string;
  source: string;
}

const TIMEOUT = 6000;

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fromFrankfurter(base: string, quote: string, day: string, fetchImpl: typeof fetch): Promise<Rate | null> {
  const today = new Date().toISOString().slice(0, 10);
  const path = day >= today ? "latest" : day;
  const j = (await getJson(`https://api.frankfurter.dev/v1/${path}?base=${base}&symbols=${quote}`, fetchImpl)) as {
    date?: string;
    rates?: Record<string, number>;
  } | null;
  const r = j?.rates?.[quote];
  return typeof r === "number" && r > 0 ? { rate: r, day: j?.date ?? day, source: "frankfurter" } : null;
}

async function fromOpenEr(base: string, quote: string, fetchImpl: typeof fetch): Promise<Rate | null> {
  const j = (await getJson(`https://open.er-api.com/v6/latest/${base}`, fetchImpl)) as {
    result?: string;
    time_last_update_unix?: number;
    rates?: Record<string, number>;
  } | null;
  const r = j?.result === "success" ? j.rates?.[quote] : undefined;
  if (typeof r !== "number" || !(r > 0)) return null;
  const day = j?.time_last_update_unix ? new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return { rate: r, day, source: "open.er-api" };
}

/**
 * Group-currency units per one unit of `base` for the expense day. Uses the
 * cache (same day, or the latest fetched today for current dates); returns
 * null when no source has the pair.
 */
export async function getRate(base: string, quote: string, day: string, fetchImpl: typeof fetch = fetch): Promise<Rate | null> {
  base = base.toUpperCase();
  quote = quote.toUpperCase();
  if (base === quote) return { rate: 1, day, source: "same" };
  if (process.env.FX_OFFLINE === "1") return null;

  const today = new Date().toISOString().slice(0, 10);
  const lookupDay = day > today ? today : day;
  const cached = await prisma.exchangeRate.findFirst({
    where:
      lookupDay === today
        ? { base, quote, fetchedAt: { gte: new Date(Date.now() - 24 * 3600_000) } }
        : { base, quote, day: { lte: lookupDay, gte: shiftDay(lookupDay, -4) } },
    orderBy: [{ day: "desc" }, { fetchedAt: "desc" }],
  });
  if (cached) return { rate: Number(cached.rate), day: cached.day, source: cached.source };

  const fresh = (await fromFrankfurter(base, quote, lookupDay, fetchImpl)) ?? (await fromOpenEr(base, quote, fetchImpl));
  if (!fresh) return null;
  await prisma.exchangeRate
    .upsert({
      where: { base_quote_day: { base, quote, day: fresh.day } },
      create: { base, quote, day: fresh.day, rate: new Decimal(fresh.rate), source: fresh.source },
      update: { rate: new Decimal(fresh.rate), source: fresh.source, fetchedAt: new Date() },
    })
    .catch(() => {});
  return fresh;
}

function shiftDay(day: string, n: number) {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
