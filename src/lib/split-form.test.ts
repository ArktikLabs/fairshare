import { describe, expect, it } from "vitest";
import {
  buildParticipants,
  evenPayerValues,
  localDateString,
  parseCents,
  previewPayers,
  previewSplit,
} from "./split-form";
import { calculateSplit } from "./money";
import { categoryLabel, guessCategory } from "./categories";
import { getCurrency, resolveCurrency, searchCurrencies } from "./currencies";

const rows = (...v: string[]) => v.map((value) => ({ value }));

describe("parseCents", () => {
  it("parses plain, decimal and comma-grouped input", () => {
    expect(parseCents("12")).toBe(1200);
    expect(parseCents("12.5")).toBe(1250);
    expect(parseCents("0.1")).toBe(10);
    expect(parseCents("1,234.56")).toBe(123456);
    expect(parseCents("12.")).toBe(1200);
  });
  it("rejects junk and more than two decimals", () => {
    expect(parseCents("")).toBeNull();
    expect(parseCents("abc")).toBeNull();
    expect(parseCents("1.234")).toBeNull();
    expect(parseCents(".")).toBeNull();
  });
});

describe("localDateString", () => {
  it("uses local calendar fields, not UTC", () => {
    const d = new Date(2026, 9, 8, 0, 30); // 00:30 local on Oct 8
    expect(localDateString(d)).toBe("2026-10-08");
  });
});

describe("previewSplit", () => {
  it("EQUAL splits to the cent", () => {
    const p = previewSplit("EQUAL", 10000, rows("", "", ""));
    expect(p.balanced).toBe(true);
    expect(p.cents).toEqual([3334, 3333, 3333]);
  });

  it("EXACT reports what is left and over", () => {
    expect(previewSplit("EXACT", 10000, rows("40", "50")).remaining).toBe(1000);
    expect(previewSplit("EXACT", 10000, rows("40", "50")).balanced).toBe(false);
    expect(previewSplit("EXACT", 10000, rows("60", "50")).remaining).toBe(-1000);
    expect(previewSplit("EXACT", 10000, rows("40", "60")).balanced).toBe(true);
  });

  it("PERCENTAGE needs 100% (server tolerance 0.01)", () => {
    expect(previewSplit("PERCENTAGE", 10000, rows("50", "40")).remaining).toBe(1000);
    const ok = previewSplit("PERCENTAGE", 10000, rows("33.33", "33.33", "33.34"));
    expect(ok.balanced).toBe(true);
    expect(ok.cents.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it("SHARES needs positive whole numbers", () => {
    expect(previewSplit("SHARES", 10000, rows("2", "1", "1")).cents).toEqual([5000, 2500, 2500]);
    expect(previewSplit("SHARES", 10000, rows("0", "1")).balanced).toBe(false);
    expect(previewSplit("SHARES", 10000, rows("1.5", "1")).balanced).toBe(false);
  });

  it("ADJUSTMENT adds extras on top of an equal split", () => {
    const p = previewSplit("ADJUSTMENT", 10000, rows("10", "", ""));
    expect(p.balanced).toBe(true);
    expect(p.cents).toEqual([4000, 3000, 3000]);
    expect(previewSplit("ADJUSTMENT", 10000, rows("120", "")).balanced).toBe(false);
  });

  it("is never balanced without an amount or people", () => {
    expect(previewSplit("EQUAL", 0, rows("")).balanced).toBe(false);
    expect(previewSplit("EQUAL", 1000, []).balanced).toBe(false);
  });

  it("agrees with the server's calculateSplit", () => {
    const p = previewSplit("PERCENTAGE", 12775, rows("50", "25", "25"));
    const built = buildParticipants("PERCENTAGE", ["a", "b", "c"], rows("50", "25", "25"), p);
    const server = calculateSplit(127.75, built.participants, built.splitMethod);
    expect(server.map((s) => Math.round(s.amount * 100))).toEqual(p.cents);
  });

  it("sends ADJUSTMENT as cents-exact EXACT amounts", () => {
    const r = rows("0.01", "", "");
    const p = previewSplit("ADJUSTMENT", 1000, r);
    const built = buildParticipants("ADJUSTMENT", ["a", "b", "c"], r, p);
    expect(built.splitMethod).toBe("EXACT");
    const sum = built.participants.reduce((s, x) => s + Math.round((x.amount ?? 0) * 100), 0);
    expect(sum).toBe(1000);
    expect(() => calculateSplit(10, built.participants, "EXACT")).not.toThrow();
  });
});

describe("previewPayers", () => {
  it("single payer always pays the total", () => {
    expect(previewPayers(5000, [""]).cents).toEqual([5000]);
    expect(previewPayers(5000, [""]).balanced).toBe(true);
  });
  it("multiple payers must add up and be non-zero", () => {
    expect(previewPayers(5000, ["20", "20"]).remaining).toBe(1000);
    expect(previewPayers(5000, ["50", "0"]).balanced).toBe(false);
    expect(previewPayers(5000, ["25", "25"]).balanced).toBe(true);
  });
  it("evenPayerValues splits to the cent", () => {
    expect(evenPayerValues(1000, 3)).toEqual(["3.34", "3.33", "3.33"]);
  });
});

describe("categories", () => {
  it("never shows raw enum names", () => {
    expect(categoryLabel("FOOD_DRINK")).toBe("Food & drink");
    expect(categoryLabel(null)).toBe("Other");
  });
  it("guesses from whole words and defaults to OTHER", () => {
    expect(guessCategory("Dinner at Joe's")).toBe("FOOD_DRINK");
    expect(guessCategory("Taxi to airport")).toBe("TRANSPORTATION");
    expect(guessCategory("Business cards")).toBe("OTHER");
  });
});

describe("currencies", () => {
  it("includes IDR and resolves preferences", () => {
    expect(getCurrency("IDR")?.name).toBe("Indonesian Rupiah");
    expect(resolveCurrency("IDR")).toBe("IDR");
    expect(resolveCurrency("ZZZ")).toBe("USD");
    expect(resolveCurrency(null)).toBe("USD");
  });
  it("searches by code and name", () => {
    expect(searchCurrencies("idr")[0].code).toBe("IDR");
    expect(searchCurrencies("rupiah").map((c) => c.code)).toContain("IDR");
    expect(searchCurrencies("")[0].code).toBe("USD");
  });
});
