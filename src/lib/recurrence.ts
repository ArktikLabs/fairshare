// Pure date maths for recurring expenses. Days are calendar days as
// "YYYY-MM-DD" strings (stored in the database as UTC midnight, like expense
// dates). Occurrence n is always computed from the start date, so a monthly
// expense on the 31st lands on Feb 28/29 and goes back to the 31st in March
// instead of drifting.

export type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
export type RepeatChoice = "NONE" | Frequency;

export const REPEAT_OPTIONS: ReadonlyArray<{ value: RepeatChoice; label: string }> = [
  { value: "NONE", label: "Does not repeat" },
  { value: "WEEKLY", label: "Every week" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Every month" },
  { value: "YEARLY", label: "Every year" },
];

export function frequencyLabel(f: Frequency): string {
  return REPEAT_OPTIONS.find((o) => o.value === f)?.label ?? f;
}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDay(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = DAY_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function parts(day: string): [number, number, number] {
  const m = DAY_RE.exec(day);
  if (!m) throw new Error(`Invalid day: ${day}`);
  return [+m[1], +m[2], +m[3]];
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number) => `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`;

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = parts(day);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Add whole months, clamping to the last day of the target month. */
export function addMonths(day: string, n: number): string {
  const [y, m, d] = parts(day);
  const idx = y * 12 + (m - 1) + n;
  const ty = Math.floor(idx / 12);
  const tm = (idx % 12) + 1;
  return fmt(ty, tm, Math.min(d, daysInMonth(ty, tm)));
}

/** Occurrence `n` (0 = the start date itself). */
export function occurrenceDate(start: string, freq: Frequency, n: number): string {
  switch (freq) {
    case "WEEKLY":
      return addDays(start, 7 * n);
    case "BIWEEKLY":
      return addDays(start, 14 * n);
    case "MONTHLY":
      return addMonths(start, n);
    case "YEARLY":
      return addMonths(start, 12 * n);
  }
}

/** The occurrence after `count` created ones, or null past the end date. */
export function nextOccurrence(start: string, freq: Frequency, count: number, endDate?: string | null): string | null {
  const next = occurrenceDate(start, freq, count);
  return endDate && next > endDate ? null : next;
}

/** Today's calendar day in an IANA time zone (falls back to UTC). */
export function todayIn(timeZone: string | null | undefined, now: Date = new Date()): string {
  try {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Every occurrence due by `today` (inclusive), starting at index `count`. Capped. */
export function dueOccurrences(
  start: string,
  freq: Frequency,
  count: number,
  today: string,
  endDate?: string | null,
  max = 12
): Array<{ index: number; day: string }> {
  const out: Array<{ index: number; day: string }> = [];
  for (let i = count; out.length < max; i++) {
    const day = occurrenceDate(start, freq, i);
    if (day > today || (endDate && day > endDate)) break;
    out.push({ index: i, day });
  }
  return out;
}

export const dayToDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
export const dateToDay = (d: Date) => d.toISOString().slice(0, 10);
