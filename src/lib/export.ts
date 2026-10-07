// CSV exports: one group (expenses with every member's share column, then a
// payments section) and one user (every expense they are on, with their share).

import { prisma } from "./prisma";
import { currencyDigits } from "./currencies";
import { toCents } from "./money";
import { csvAmount, fileSlug, toCsv, type CsvCell } from "./csv";
import { categoryLabel } from "./categories";

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const nameOf = (u: { name: string | null; displayName: string | null; email: string }) => u.name || u.displayName || u.email;
const userSel = { select: { id: true, name: true, displayName: true, email: true } } as const;

/** null when the user is not an active member (callers answer 404). */
export async function groupCsv(groupId: string, userId: string): Promise<{ filename: string; body: string } | null> {
  const group = await prisma.group.findFirst({
    where: { id: groupId, isActive: true, members: { some: { userId, status: "ACTIVE" } } },
    include: { members: { include: { user: userSel }, orderBy: { createdAt: "asc" } } },
  });
  if (!group) return null;
  const cur = group.currency;
  const digits = currencyDigits(cur);
  const [expenses, payments] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId, isDeleted: false },
      include: { payers: { include: { user: userSel } }, splits: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.settlement.findMany({
      where: { groupId, status: "CONFIRMED", deletedAt: null },
      include: { payer: userSel, payee: userSel },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // A column for everyone who ever had a share (left members included)
  const people = new Map<string, string>();
  for (const m of group.members) people.set(m.userId, nameOf(m.user));
  for (const e of expenses) for (const p of e.payers) people.set(p.userId, nameOf(p.user));
  const shareIds = new Set(expenses.flatMap((e) => e.splits.map((s) => s.userId)));
  const missing = [...shareIds].filter((id) => !people.has(id));
  if (missing.length) {
    const us = await prisma.user.findMany({ where: { id: { in: missing } }, ...userSel });
    for (const u of us) people.set(u.id, nameOf(u));
  }
  const cols = [...people.entries()].filter(([id]) => shareIds.has(id) || group.members.some((m) => m.userId === id && m.status === "ACTIVE"));
  const amt = (v: { toString(): string } | number | null | undefined) => (v == null ? "" : csvAmount(toCents(Number(v)), digits));

  const rows: CsvCell[][] = [
    ["Date", "Description", "Category", "Currency", "Amount", "Original amount", "Original currency", "Exchange rate", "Paid by", ...cols.map(([, n]) => `Share: ${n}`), "Notes"],
  ];
  for (const e of expenses) {
    const share = new Map(e.splits.map((s) => [s.userId, s.amount]));
    rows.push([
      ymd(e.date),
      e.description,
      e.category ? categoryLabel(e.category) : "",
      cur,
      amt(e.amount),
      e.originalAmount != null && e.originalCurrency ? csvAmount(toCents(Number(e.originalAmount)), currencyDigits(e.originalCurrency)) : "",
      e.originalCurrency ?? "",
      e.exchangeRate != null ? Number(e.exchangeRate).toString() : "",
      e.payers.map((p) => (e.payers.length > 1 ? `${nameOf(p.user)} (${amt(p.amountPaid)})` : nameOf(p.user))).join("; "),
      ...cols.map(([id]) => (share.has(id) ? amt(share.get(id)) : "")),
      e.notes ?? "",
    ]);
  }
  rows.push([]);
  rows.push(["Payments"]);
  rows.push(["Date", "From", "To", "Currency", "Amount", "Method", "Note"]);
  for (const p of payments) {
    rows.push([ymd(p.confirmedAt ?? p.createdAt), nameOf(p.payer), nameOf(p.payee), cur, amt(p.amount), p.method, p.description ?? ""]);
  }
  const stamp = ymd(new Date());
  const label = group.kind === "DIRECT" ? "friend" : group.name;
  return { filename: `fairshare-${fileSlug(label)}-${stamp}.csv`, body: toCsv(rows) };
}

/** Every expense the user is on (any group), with their share and what they paid. */
export async function userCsv(userId: string): Promise<{ filename: string; body: string }> {
  const expenses = await prisma.expense.findMany({
    where: {
      isDeleted: false,
      group: { isActive: true },
      OR: [{ splits: { some: { userId } } }, { payers: { some: { userId } } }],
    },
    include: {
      group: { select: { name: true, currency: true, kind: true, members: { include: { user: userSel } } } },
      payers: { include: { user: userSel } },
      splits: { where: { userId } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const rows: CsvCell[][] = [
    ["Date", "Group", "Description", "Category", "Currency", "Amount", "Original amount", "Original currency", "Paid by", "You paid", "Your share", "Notes"],
  ];
  for (const e of expenses) {
    const cur = e.group?.currency ?? "USD";
    const digits = currencyDigits(cur);
    const amt = (v: { toString(): string } | number) => csvAmount(toCents(Number(v)), digits);
    const mine = e.payers.find((p) => p.userId === userId);
    const other = e.group?.kind === "DIRECT" ? e.group.members.find((m) => m.userId !== userId) : null;
    rows.push([
      ymd(e.date),
      e.group ? (e.group.kind === "DIRECT" ? `With ${other ? nameOf(other.user) : "friend"}` : e.group.name) : "",
      e.description,
      e.category ? categoryLabel(e.category) : "",
      cur,
      amt(e.amount),
      e.originalAmount != null && e.originalCurrency ? csvAmount(toCents(Number(e.originalAmount)), currencyDigits(e.originalCurrency)) : "",
      e.originalCurrency ?? "",
      e.payers.map((p) => nameOf(p.user)).join("; "),
      mine ? amt(mine.amountPaid) : amt(0),
      e.splits[0] ? amt(e.splits[0].amount) : amt(0),
      e.notes ?? "",
    ]);
  }
  return { filename: `fairshare-my-expenses-${ymd(new Date())}.csv`, body: toCsv(rows) };
}

export function csvResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  };
}
