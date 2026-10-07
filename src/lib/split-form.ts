// Pure helpers behind the add-expense form: live remainder lines, balanced
// checks and the cents-exact payload. Everything works in integer cents and
// mirrors the server rules in money.ts, so "balanced" here means the server
// will accept it.

import { allocateCents, allocateInUnits, fromCents } from "./money";

export type SplitMode = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES" | "ADJUSTMENT";
export type ItemSplitMode = Exclude<SplitMode, "ADJUSTMENT">;

/**
 * Parse a money string ("12", "12.5", "1,234.56") into cents; null if invalid.
 * With `digits = 0` (IDR, JPY...) only whole amounts are accepted and both
 * "," and "." are read as thousands separators ("900.000" = 900000).
 */
export function parseCents(input: string | number | null | undefined, digits: 0 | 2 = 2): number | null {
  if (input === null || input === undefined) return null;
  let s = String(input).trim();
  if (digits === 0) {
    if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");
    else if (/^-?\d+[.,]0{1,2}$/.test(s)) s = s.replace(/[.,]0+$/, "");
    if (!/^-?\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n * 100 : null;
  }
  s = s.replace(/,/g, "");
  if (s === "") return null;
  if (!/^-?\d*(\.\d{0,2})?$/.test(s) || s === "-" || s === ".") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/**
 * Parse an amount typed for `currency`. Zero-decimal currencies read
 * "900.000" as nine hundred thousand, but still accept a 2-decimal amount
 * (old balances can carry cents).
 */
export function parseAmount(input: string, currency: string, digitsOf: (c: string) => 0 | 2): number | null {
  if (digitsOf(currency) === 0) return parseCents(input, 0) ?? parseCents(input, 2);
  return parseCents(input, 2);
}

/** Input text for an amount: whole number when it has no cents. */
export function amountToInput(amount: number, digits: 0 | 2): string {
  const cents = Math.round(amount * 100);
  return digits === 0 && cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** Parse a percentage ("33.33") into hundredths of a percent; null if invalid. */
export function parsePercent(input: string | null | undefined): number | null {
  const c = parseCents(input ?? "");
  return c === null ? null : c; // same 2-decimal rule: 33.33% -> 3333
}

/** Today's date in the browser's local time zone as YYYY-MM-DD. */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface SplitRowInput {
  /** Raw text from the row's input (amount, percent, shares or adjustment). */
  value: string;
}

export interface SplitPreview {
  /** Per-row share in cents (0 when it cannot be computed yet). */
  cents: number[];
  /** True when the server will accept the split as entered. */
  balanced: boolean;
  /**
   * What is left to assign. For EXACT/ADJUSTMENT in cents, for PERCENTAGE in
   * hundredths of a percent. 0 when balanced; negative = over-assigned.
   */
  remaining: number;
  /** Short human message for the status line (empty when balanced). */
  problem: string;
}

/**
 * Compute the live split for `mode`. `rows` are the ticked participants in
 * order. `totalCents` may be 0/null while the user is still typing.
 */
export function previewSplit(
  mode: SplitMode,
  totalCents: number | null,
  rows: SplitRowInput[],
  /** Allocation step in cents (100 for zero-decimal currencies) */
  unit = 1
): SplitPreview {
  const digits: 0 | 2 = unit >= 100 ? 0 : 2;
  const n = rows.length;
  const total = totalCents ?? 0;
  const zero = rows.map(() => 0);
  if (n === 0) return { cents: [], balanced: false, remaining: total, problem: "Pick at least one person" };
  if (total <= 0) return { cents: zero, balanced: false, remaining: 0, problem: "Enter an amount" };

  switch (mode) {
    case "EQUAL":
      return { cents: allocateInUnits(total, rows.map(() => 1), unit), balanced: true, remaining: 0, problem: "" };

    case "EXACT": {
      const parsed = rows.map((r) => (r.value.trim() === "" ? 0 : parseCents(r.value, digits)));
      if (parsed.some((c) => c === null || c < 0)) {
        return { cents: zero, balanced: false, remaining: total, problem: digits === 0 ? "Amounts must be whole numbers" : "Amounts must be positive numbers" };
      }
      const cents = parsed as number[];
      const remaining = total - cents.reduce((s, c) => s + c, 0);
      return {
        cents,
        balanced: remaining === 0,
        remaining,
        problem: remaining === 0 ? "" : remaining > 0 ? "left to assign" : "over the total",
      };
    }

    case "PERCENTAGE": {
      const parsed = rows.map((r) => (r.value.trim() === "" ? 0 : parsePercent(r.value)));
      if (parsed.some((p) => p === null || p < 0)) {
        return { cents: zero, balanced: false, remaining: 10000, problem: "Percentages must be positive numbers" };
      }
      const pct = parsed as number[];
      const sum = pct.reduce((s, p) => s + p, 0);
      const remaining = 10000 - sum;
      // Server accepts |sum - 100| <= 0.01
      const balanced = Math.abs(remaining) <= 1 && sum > 0;
      return {
        cents: sum > 0 ? allocateInUnits(total, pct, unit) : zero,
        balanced,
        remaining: balanced ? 0 : remaining,
        problem: balanced ? "" : remaining > 0 ? "left to assign" : "over 100%",
      };
    }

    case "SHARES": {
      const shares = rows.map((r) => (r.value.trim() === "" ? NaN : Number(r.value)));
      if (shares.some((s) => !Number.isInteger(s) || s <= 0)) {
        return { cents: zero, balanced: false, remaining: 0, problem: "Shares must be whole numbers above 0" };
      }
      return { cents: allocateInUnits(total, shares, unit), balanced: true, remaining: 0, problem: "" };
    }

    case "ADJUSTMENT": {
      const parsed = rows.map((r) => (r.value.trim() === "" ? 0 : parseCents(r.value, digits)));
      if (parsed.some((c) => c === null)) {
        return { cents: zero, balanced: false, remaining: 0, problem: "Adjustments must be numbers" };
      }
      const adj = parsed as number[];
      const rest = total - adj.reduce((s, a) => s + a, 0);
      if (rest < 0) {
        return { cents: zero, balanced: false, remaining: rest, problem: "Adjustments exceed the total" };
      }
      const cents = allocateInUnits(rest, rows.map(() => 1), unit).map((b, i) => b + adj[i]);
      if (cents.some((c) => c < 0)) {
        return { cents: zero, balanced: false, remaining: 0, problem: "A share would be negative" };
      }
      return { cents, balanced: true, remaining: 0, problem: "" };
    }
  }
}

export interface PayerPreview {
  cents: number[];
  balanced: boolean;
  remaining: number;
  problem: string;
}

/** Payer amounts must be positive and add up to the total, to the cent. */
export function previewPayers(totalCents: number | null, values: string[], digits: 0 | 2 = 2): PayerPreview {
  const total = totalCents ?? 0;
  if (values.length === 0) return { cents: [], balanced: false, remaining: total, problem: "Pick who paid" };
  if (values.length === 1) {
    return { cents: [total], balanced: total > 0, remaining: 0, problem: total > 0 ? "" : "Enter an amount" };
  }
  const parsed = values.map((v) => (v.trim() === "" ? 0 : parseCents(v, digits)));
  if (parsed.some((c) => c === null || c < 0)) {
    return { cents: values.map(() => 0), balanced: false, remaining: total, problem: "Amounts must be positive numbers" };
  }
  const cents = parsed as number[];
  const remaining = total - cents.reduce((s, c) => s + c, 0);
  if (remaining !== 0) {
    return { cents, balanced: false, remaining, problem: remaining > 0 ? "left to assign" : "over the total" };
  }
  if (cents.some((c) => c === 0)) {
    return { cents, balanced: false, remaining: 0, problem: "Every payer needs an amount (remove payers who paid nothing)" };
  }
  return { cents, balanced: total > 0, remaining: 0, problem: "" };
}

/** Split `totalCents` evenly into strings for the payer inputs. */
export function evenPayerValues(totalCents: number | null, count: number, digits: 0 | 2 = 2): string[] {
  if (!totalCents || totalCents <= 0 || count === 0) return Array.from({ length: count }, () => "");
  return allocateInUnits(totalCents, Array.from({ length: count }, () => 1), digits === 0 ? 100 : 1).map((c) =>
    centsToInput(c, digits)
  );
}

export const centsToNumber = fromCents;

/** Format cents as a plain string for inputs ("12.50", or "900000" for zero-decimal currencies). */
export function centsToInput(cents: number, digits: 0 | 2 = 2): string {
  return (cents / 100).toFixed(digits);
}

/** Format hundredths of a percent ("33.33"). */
export function percentToString(hundredths: number): string {
  return (hundredths / 100).toFixed(2).replace(/\.00$/, "");
}

export interface ParticipantPayload {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

/**
 * Build the API participant list for a simple split. ADJUSTMENT is sent as
 * EXACT with computed amounts; every amount is a whole number of cents.
 */
export function buildParticipants(
  mode: SplitMode,
  userIds: string[],
  rows: SplitRowInput[],
  preview: SplitPreview
): { splitMethod: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES"; participants: ParticipantPayload[] } {
  switch (mode) {
    case "EQUAL":
      return { splitMethod: "EQUAL", participants: userIds.map((userId) => ({ userId })) };
    case "PERCENTAGE":
      return {
        splitMethod: "PERCENTAGE",
        participants: userIds.map((userId, i) => ({
          userId,
          percentage: (parsePercent(rows[i].value) ?? 0) / 100,
        })),
      };
    case "SHARES":
      return {
        splitMethod: "SHARES",
        participants: userIds.map((userId, i) => ({ userId, shares: Number(rows[i].value) })),
      };
    case "EXACT":
    case "ADJUSTMENT":
      return {
        splitMethod: "EXACT",
        participants: userIds.map((userId, i) => ({ userId, amount: fromCents(preview.cents[i] ?? 0) })),
      };
  }
}

// ----- edit mode -----

export interface StoredSplit {
  userId: string;
  /** cents */
  amount: number;
  percentage: number | null;
  shares: number | null;
}

export interface StoredExpenseForForm {
  description: string;
  /** cents */
  amount: number;
  /** YYYY-MM-DD */
  date: string;
  category: string | null;
  notes: string | null;
  splitMethod: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";
  payers: Array<{ userId: string; amount: number }>;
  splits: StoredSplit[];
  items: Array<{ name: string; amount: number; splitMethod: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES"; splits: StoredSplit[] }>;
  /** Paid in another currency (amounts above are in it) */
  currency?: string | null;
  exchangeRate?: number | null;
  /** This expense starts a repeating series */
  repeat?: { frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY"; endDate: string | null } | null;
}

export interface SplitState {
  mode: ItemSplitMode;
  selected: string[];
  values: Record<string, string>;
}

/** Input text for one stored split row in the given mode. */
function valuesFor(mode: ItemSplitMode, splits: StoredSplit[], digits: 0 | 2 = 2): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of splits) {
    if (mode === "EXACT") out[s.userId] = centsToInput(s.amount, digits);
    else if (mode === "PERCENTAGE") out[s.userId] = s.percentage !== null ? String(Number(s.percentage)) : "";
    else if (mode === "SHARES") out[s.userId] = s.shares !== null ? String(s.shares) : "1";
  }
  return out;
}

/**
 * Editor state for a stored split. `order` is the member order of the form,
 * so ticked people show in the same order as when adding. An EQUAL split
 * whose stored amounts are not the equal allocation (e.g. edited data) falls
 * back to EXACT so saving does not silently change anyone's share.
 */
export function splitStateFromStored(
  method: ItemSplitMode,
  totalCents: number,
  splits: StoredSplit[],
  order: string[],
  unit = 1
): SplitState {
  const selected = order.filter((id) => splits.some((s) => s.userId === id));
  // People on the expense who are not in the member list go last
  splits.forEach((s) => !selected.includes(s.userId) && selected.push(s.userId));
  const byId = new Map(splits.map((s) => [s.userId, s]));
  const ordered = selected.map((id) => byId.get(id)!);
  let mode: ItemSplitMode = method;
  if (mode === "EQUAL") {
    // Older zero-decimal expenses were allocated in cents; accept either
    const even = allocateInUnits(totalCents, ordered.map(() => 1), unit);
    const evenCents = allocateCents(totalCents, ordered.map(() => 1));
    if (ordered.some((s, i) => s.amount !== even[i]) && ordered.some((s, i) => s.amount !== evenCents[i])) mode = "EXACT";
  }
  if (mode === "PERCENTAGE" && ordered.some((s) => s.percentage === null)) mode = "EXACT";
  if (mode === "SHARES" && ordered.some((s) => s.shares === null)) mode = "EXACT";
  return { mode, selected, values: valuesFor(mode, ordered, unit >= 100 ? 0 : 2) };
}
