// Turns a validated, resolved expense into the rows we store, in the group
// currency. When the expense was paid in another currency the typed amounts
// are split in that currency first (its own minor unit), then converted with
// the day's rate (or a manual one) so payers and shares still add up.

import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";
import { computeExpenseRows, type ComputedRows, type ResolvedExpenseInput } from "./expense-compute";
import { convertRows } from "./fx";
import { getRate } from "./fx-rates";
import { getCurrency, minorUnitCents } from "./currencies";
import { toCents, fromCents } from "./money";
import { HttpError } from "./expense-write";
import type { Frequency } from "./recurrence";

/** Extra fields on create/edit bodies (all optional, old clients unaffected). */
export const ExpenseExtrasSchema = z.object({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((c) => Boolean(getCurrency(c)), "Unknown currency")
    .optional()
    .nullable(),
  /** group-currency units per 1 unit of `currency`; when absent we look it up */
  exchangeRate: z.number().positive().max(1e9).optional().nullable(),
  repeat: z
    .object({
      frequency: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
});
export type ExpenseExtras = z.infer<typeof ExpenseExtrasSchema>;

export function parseExtras(raw: unknown): ExpenseExtras {
  if (typeof raw !== "object" || raw === null) return {};
  const r = raw as Record<string, unknown>;
  return ExpenseExtrasSchema.parse({ currency: r.currency, exchangeRate: r.exchangeRate, repeat: r.repeat });
}

export interface FxInfo {
  originalAmount: Decimal | null;
  originalCurrency: string | null;
  exchangeRate: Decimal | null;
  rateDate: Date | null;
  rateSource: string | null;
}

export const NO_FX: FxInfo = { originalAmount: null, originalCurrency: null, exchangeRate: null, rateDate: null, rateSource: null };

export interface PreparedExpense {
  rows: ComputedRows;
  /** group-currency amount (units, 2 decimals) */
  amount: number;
  fx: FxInfo;
}

/** Thrown when no rate is available: the form then asks for a manual one. */
export class RateUnavailableError extends HttpError {
  constructor(from: string, to: string) {
    super(422, `No exchange rate available for ${from} to ${to}. Enter the rate yourself.`);
  }
}

export async function prepareExpense(
  input: ResolvedExpenseInput,
  groupCurrency: string,
  extras: ExpenseExtras,
  day: string,
  rateLookup: typeof getRate = getRate
): Promise<PreparedExpense> {
  const currency = extras.currency && extras.currency !== groupCurrency ? extras.currency : null;
  if (!currency) {
    const rows = computeExpenseRows(input, minorUnitCents(groupCurrency));
    return { rows, amount: input.amount, fx: NO_FX };
  }
  const rows = computeExpenseRows(input, minorUnitCents(currency));
  let rate: number;
  let rateDay = day;
  let source = "manual";
  if (extras.exchangeRate) {
    rate = extras.exchangeRate;
  } else {
    const r = await rateLookup(currency, groupCurrency, day);
    if (!r) throw new RateUnavailableError(currency, groupCurrency);
    rate = r.rate;
    rateDay = r.day;
    source = r.source;
  }
  const converted = convertRows(rows, toCents(input.amount), rate, minorUnitCents(groupCurrency));
  return {
    rows: converted.rows,
    amount: fromCents(converted.totalCents),
    fx: {
      originalAmount: new Decimal(input.amount),
      originalCurrency: currency,
      exchangeRate: new Decimal(rate.toPrecision(12)),
      rateDate: new Date(`${rateDay}T00:00:00.000Z`),
      rateSource: source,
    },
  };
}

/** Activity payload bits for a foreign-currency expense. */
export function fxPayload(fx: FxInfo): { originalAmount?: number; originalCurrency?: string } {
  return fx.originalCurrency && fx.originalAmount
    ? { originalCurrency: fx.originalCurrency, originalAmount: Math.round(Number(fx.originalAmount) * 100) }
    : {};
}

/** What a recurring template stores to recreate the expense. */
export interface RecurringTemplate {
  input: ResolvedExpenseInput;
  description: string;
  category: string | null;
  notes: string | null;
  /** foreign currency (null = group currency) */
  currency: string | null;
  /** manual rate to fall back on */
  manualRate: number | null;
}

export function repeatFrequency(extras: ExpenseExtras): Frequency | null | undefined {
  if (!extras.repeat) return undefined; // not sent: leave as is
  return extras.repeat.frequency === "NONE" ? null : extras.repeat.frequency;
}
