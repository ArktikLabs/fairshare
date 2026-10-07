// Pure currency-conversion maths. An expense paid in another currency is
// entered and split in that currency, then every row is converted to the
// group currency so the ledger stays in one currency. Conversion allocates
// the converted total proportionally (largest remainder, in the group
// currency's minor unit), so converted payers and shares still add up to the
// converted total exactly.

import { allocateInUnits } from "./money";

/** Convert cents with a rate (group units per original unit), rounded to `unit` cents. */
export function convertCents(cents: number, rate: number, unit = 1): number {
  if (!(rate > 0) || !Number.isFinite(rate)) throw new Error("Exchange rate must be a positive number");
  const raw = cents * rate;
  return Math.round(raw / unit) * unit;
}

export interface ConvertibleRows {
  payers: Array<{ amountPaid: number }>;
  splits: Array<{ amount: number }>;
  items: Array<{ amount: number; splits: Array<{ amount: number }> }>;
}

const toC = (v: number) => Math.round(v * 100);
const fromC = (c: number) => c / 100;

/** Spread `total` cents over parts proportional to `weights` (all zero -> even). */
function spread(total: number, weights: number[], unit: number): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((s, w) => s + w, 0);
  return allocateInUnits(total, sum > 0 ? weights : weights.map(() => 1), unit);
}

/**
 * Convert computed rows (amounts in the original currency) into the group
 * currency. Returns the converted total and new rows; every list adds up to
 * the converted total.
 */
export function convertRows<T extends ConvertibleRows>(
  rows: T,
  totalCents: number,
  rate: number,
  unit = 1
): { totalCents: number; rows: T } {
  const total = Math.max(unit, convertCents(totalCents, rate, unit));
  const payerC = spread(total, rows.payers.map((p) => toC(p.amountPaid)), unit);
  const payers = rows.payers.map((p, i) => ({ ...p, amountPaid: fromC(payerC[i]) }));
  let splits = rows.splits;
  let items = rows.items;
  if (rows.items.length > 0) {
    const itemC = spread(total, rows.items.map((i) => toC(i.amount)), unit);
    items = rows.items.map((it, i) => {
      const sc = spread(itemC[i], it.splits.map((s) => toC(s.amount)), unit);
      return { ...it, amount: fromC(itemC[i]), splits: it.splits.map((s, j) => ({ ...s, amount: fromC(sc[j]) })) };
    });
  } else {
    const sc = spread(total, rows.splits.map((s) => toC(s.amount)), unit);
    splits = rows.splits.map((s, i) => ({ ...s, amount: fromC(sc[i]) }));
  }
  return { totalCents: total, rows: { ...rows, payers, splits, items } };
}

/** "1 USD = 16,250.5 IDR" */
export function describeRate(from: string, to: string, rate: number): string {
  const digits = rate >= 100 ? 2 : rate >= 1 ? 4 : 6;
  const shown = new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(rate);
  return `1 ${from} = ${shown} ${to}`;
}

/** Parse a typed rate ("16,250.5" or "0.000061"); null if invalid. */
export function parseRate(input: string): number | null {
  const s = input.trim().replace(/,/g, "");
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && Number.isFinite(n) ? n : null;
}
