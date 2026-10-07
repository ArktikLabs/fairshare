import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_VALUES, categoryLabel, guessCategory, isCategory } from "./categories";
import { CURRENCIES, getCurrency, isSupportedCurrency, resolveCurrency, searchCurrencies } from "./currencies";
import { addToTotals, type CurrencyTotals } from "./overview";

describe("categories", () => {
  it("has a label for every enum value", () => {
    expect(CATEGORIES.map((c) => c.value)).toEqual([...CATEGORY_VALUES]);
    for (const v of CATEGORY_VALUES) expect(categoryLabel(v)).not.toMatch(/_/);
  });
  it("falls back to Other for unknown values", () => {
    expect(categoryLabel(null)).toBe("Other");
    expect(categoryLabel("NOPE")).toBe("Other");
    expect(isCategory("NOPE")).toBe(false);
    expect(isCategory("TRAVEL")).toBe(true);
  });
  it("guesses from whole words only", () => {
    expect(guessCategory("Dinner at Warung")).toBe("FOOD_DRINK");
    expect(guessCategory("Grab to airport")).toBe("TRANSPORTATION");
    expect(guessCategory("business cards")).toBe("OTHER");
    expect(guessCategory("")).toBe("OTHER");
  });
});

describe("currencies", () => {
  it("includes IDR and USD with names", () => {
    expect(getCurrency("IDR")?.name).toMatch(/Rupiah/i);
    expect(getCurrency("USD")).toBeDefined();
    expect(new Set(CURRENCIES.map((c) => c.code)).size).toBe(CURRENCIES.length);
  });
  it("validates and resolves", () => {
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("XXX")).toBe(false);
    expect(resolveCurrency("IDR")).toBe("IDR");
    expect(resolveCurrency("nope")).toBe("USD");
    expect(resolveCurrency(null)).toBe("USD");
  });
  it("searches by code and name", () => {
    expect(searchCurrencies("idr")[0].code).toBe("IDR");
    expect(searchCurrencies("euro").some((c) => c.code === "EUR")).toBe(true);
    expect(searchCurrencies("").length).toBe(CURRENCIES.length);
  });
});

describe("addToTotals", () => {
  it("accumulates per currency in cents", () => {
    const t: Record<string, CurrencyTotals> = {};
    addToTotals(t, "USD", 0.1);
    addToTotals(t, "USD", 0.2);
    addToTotals(t, "USD", -1.05);
    addToTotals(t, "IDR", -50000);
    expect(t.USD).toEqual({ owe: 1.05, owed: 0.3, net: -0.75 });
    expect(t.IDR).toEqual({ owe: 50000, owed: 0, net: -50000 });
  });
});
