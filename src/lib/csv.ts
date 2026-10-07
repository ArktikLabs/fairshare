// CSV writing for exports. RFC 4180 quoting, CRLF line ends and a UTF-8 BOM
// so Excel opens non-ASCII names correctly. Text that a spreadsheet would run
// as a formula (= + - @, tab, CR at the start) is prefixed with an apostrophe.

export type CsvCell = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : String(v);
  if (typeof v === "string" && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(cells: CsvCell[]): string {
  return cells.map(csvCell).join(",");
}

export const BOM = "\uFEFF";

/** Whole file: BOM + rows joined by CRLF (with a trailing CRLF). */
export function toCsv(rows: CsvCell[][]): string {
  return BOM + rows.map(csvRow).join("\r\n") + "\r\n";
}

/** Amount as a plain number string with the currency's decimals ("12.50", "900000"). */
export function csvAmount(cents: number, digits: 0 | 2): string {
  if (digits === 0 && cents % 100 === 0) return String(cents / 100);
  return (cents / 100).toFixed(2);
}

/** Safe file name part: letters, digits, dashes. */
export function fileSlug(s: string): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .toLowerCase()
      .slice(0, 40) || "export"
  );
}
