// Money helpers. All split math runs in integer cents so the parts of an
// expense always add back up to its total (no 33.33 + 33.33 + 33.33 = 99.99).

export type SplitMethodName = "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES";

export interface SplitInput {
  userId: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

export interface SplitResult extends SplitInput {
  amount: number;
}

export const toCents = (value: number) => Math.round(value * 100);
export const fromCents = (cents: number) => cents / 100;

/**
 * Split `totalCents` proportionally to `weights` using the largest-remainder
 * method. The result always sums to exactly `totalCents`.
 */
export function allocateCents(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0) throw new Error("Split weights must be positive");

  const raw = weights.map((w) => (totalCents * w) / weightSum);
  const base = raw.map((r) => Math.floor(r));
  let remainder = totalCents - base.reduce((s, b) => s + b, 0);

  // Hand out the leftover cents to the largest fractional parts first;
  // ties go to the earlier participant so the result is deterministic.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    base[i] += 1;
    remainder -= 1;
  }
  return base;
}

/**
 * Like allocateCents, but hands out whole `unit`s (e.g. unit = 100 for
 * zero-decimal currencies such as IDR or JPY, so nobody gets a fraction of a
 * rupiah). Any remainder below one unit (only for legacy totals that are not
 * a whole number of units) goes to the first largest part. Always sums to
 * exactly `totalCents`.
 */
export function allocateInUnits(totalCents: number, weights: number[], unit = 1): number[] {
  if (unit <= 1) return allocateCents(totalCents, weights);
  const units = Math.floor(totalCents / unit);
  const leftover = totalCents - units * unit;
  const parts = allocateCents(units, weights).map((u) => u * unit);
  if (leftover > 0 && parts.length > 0) {
    let max = 0;
    parts.forEach((p, i) => p > parts[max] && (max = i));
    parts[max] += leftover;
  }
  return parts;
}

/** Validate inputs for a split and return per-participant amounts. */
export function calculateSplit(
  total: number,
  participants: SplitInput[],
  method: SplitMethodName,
  /** Allocation step in cents: 100 for zero-decimal currencies, else 1. */
  unit = 1
): SplitResult[] {
  if (participants.length === 0) {
    throw new Error("At least one participant is required");
  }
  const ids = new Set(participants.map((p) => p.userId));
  if (ids.size !== participants.length) {
    throw new Error("Each participant can only appear once in a split");
  }

  const totalCents = toCents(total);

  switch (method) {
    case "EQUAL": {
      const cents = allocateInUnits(totalCents, participants.map(() => 1), unit);
      return participants.map((p, i) => ({ ...p, amount: fromCents(cents[i]) }));
    }
    case "EXACT": {
      const cents = participants.map((p) => toCents(p.amount ?? 0));
      if (cents.some((c) => c < 0)) throw new Error("Split amounts cannot be negative");
      const sum = cents.reduce((s, c) => s + c, 0);
      if (sum !== totalCents) {
        throw new Error("Sum of split amounts must equal expense total for EXACT splits");
      }
      return participants.map((p, i) => ({ ...p, amount: fromCents(cents[i]) }));
    }
    case "PERCENTAGE": {
      const pct = participants.map((p) => p.percentage ?? 0);
      if (pct.some((x) => x < 0)) throw new Error("Percentages cannot be negative");
      const sum = pct.reduce((s, x) => s + x, 0);
      if (Math.abs(sum - 100) > 0.01) throw new Error("Sum of percentages must equal 100%");
      const cents = allocateInUnits(totalCents, pct, unit);
      return participants.map((p, i) => ({ ...p, amount: fromCents(cents[i]) }));
    }
    case "SHARES": {
      const shares = participants.map((p) => p.shares ?? 1);
      if (shares.some((s) => !Number.isInteger(s) || s <= 0)) {
        throw new Error("Shares must be positive whole numbers");
      }
      const cents = allocateInUnits(totalCents, shares, unit);
      return participants.map((p, i) => ({ ...p, amount: fromCents(cents[i]) }));
    }
    default:
      throw new Error("Invalid split method");
  }
}

/** Throw unless the payers' amounts add up to the expense total (to the cent). */
export function assertPayersMatchTotal(total: number, paid: number[]) {
  const sum = paid.reduce((s, a) => s + toCents(a), 0);
  if (sum !== toCents(total)) {
    throw new Error("Sum of payer amounts must equal expense total");
  }
}
