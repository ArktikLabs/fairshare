// Spending insights: the user's own share (not group totals) by category and
// by month, per currency (amounts in different currencies are never added).

import { prisma } from "./prisma";
import { toCents } from "./money";
import { CATEGORIES, categoryLabel } from "./categories";

export interface InsightsQuery {
  groupId?: string | null;
  /** YYYY-MM-DD inclusive */
  from?: string | null;
  to?: string | null;
}

export interface CurrencyInsights {
  currency: string;
  totalCents: number;
  byCategory: Array<{ category: string; label: string; cents: number }>;
  /** Every month in range, oldest first, including empty months */
  byMonth: Array<{ month: string; label: string; cents: number }>;
  expenseCount: number;
}

export interface Insights {
  from: string;
  to: string;
  currencies: CurrencyInsights[];
  groups: Array<{ id: string; name: string }>;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Default range: the last 6 months including this one. */
export function defaultRange(now = new Date()): { from: string; to: string } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m - 5, 1)).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

/** "2026-01" .. "2026-06" for a day range (capped at 36 months). */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = +from.slice(0, 4);
  let m = +from.slice(5, 7);
  const ey = +to.slice(0, 4);
  const em = +to.slice(5, 7);
  while ((y < ey || (y === ey && m <= em)) && out.length < 36) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (ym: string) => `${MONTHS[+ym.slice(5, 7) - 1]} ${ym.slice(2, 4)}`;

/** Pure aggregation (unit-tested). */
export function aggregate(
  rows: Array<{ currency: string; category: string | null; date: Date; cents: number }>,
  from: string,
  to: string
): CurrencyInsights[] {
  const months = monthsBetween(from, to);
  const by = new Map<string, { cat: Map<string, number>; month: Map<string, number>; total: number; n: number }>();
  for (const r of rows) {
    if (r.cents === 0) continue;
    let b = by.get(r.currency);
    if (!b) by.set(r.currency, (b = { cat: new Map(), month: new Map(), total: 0, n: 0 }));
    const cat = r.category || "OTHER";
    b.cat.set(cat, (b.cat.get(cat) ?? 0) + r.cents);
    const ym = r.date.toISOString().slice(0, 7);
    b.month.set(ym, (b.month.get(ym) ?? 0) + r.cents);
    b.total += r.cents;
    b.n++;
  }
  return [...by.entries()]
    .map(([currency, b]) => ({
      currency,
      totalCents: b.total,
      expenseCount: b.n,
      byCategory: [...b.cat.entries()]
        .map(([category, cents]) => ({ category, label: categoryLabel(category), cents }))
        .sort((x, y) => y.cents - x.cents),
      byMonth: months.map((m) => ({ month: m, label: monthLabel(m), cents: b.month.get(m) ?? 0 })),
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export async function loadInsights(userId: string, q: InsightsQuery = {}): Promise<Insights> {
  const def = defaultRange();
  let from = q.from && DAY.test(q.from) ? q.from : def.from;
  let to = q.to && DAY.test(q.to) ? q.to : def.to;
  if (from > to) [from, to] = [to, from];

  const memberships = await prisma.groupMember.findMany({
    where: { userId, status: "ACTIVE", group: { isActive: true, kind: "STANDARD" } },
    select: { group: { select: { id: true, name: true } } },
    orderBy: { group: { name: "asc" } },
  });
  const groups = memberships.map((m) => m.group);
  const groupId = q.groupId && groups.some((g) => g.id === q.groupId) ? q.groupId : null;

  const splits = await prisma.expenseSplit.findMany({
    where: {
      userId,
      expense: {
        isDeleted: false,
        date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) },
        group: groupId ? { id: groupId, isActive: true } : { isActive: true, members: { some: { userId, status: "ACTIVE" } } },
      },
    },
    select: { amount: true, expense: { select: { date: true, category: true, group: { select: { currency: true } } } } },
  });
  const rows = splits.map((s) => ({
    currency: s.expense.group?.currency ?? "USD",
    category: s.expense.category,
    date: s.expense.date,
    cents: toCents(Number(s.amount)),
  }));
  return { from, to, currencies: aggregate(rows, from, to), groups };
}

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c, i) => [c.value, ["#0f766e", "#2563eb", "#d97706", "#7c3aed", "#db2777", "#059669", "#dc2626", "#0891b2", "#65a30d", "#9333ea", "#ea580c", "#475569"][i % 12]])
);
