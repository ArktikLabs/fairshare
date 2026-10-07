import { describe, expect, it, vi } from "vitest";
import { addMonths, dueOccurrences, nextOccurrence, occurrenceDate, todayIn, isDay } from "./recurrence";
import { convertCents, convertRows, describeRate, parseRate } from "./fx";
import { checkWhatsAppNumber, isWhatsAppConfigured, phoneDigits, sendWhatsAppText, toChatId, wahaConfig } from "./notify/whatsapp-waha";
import { eventForActivity, recipientsFor, wants } from "./notify/events";
import type { ActivityLike } from "./activity-format";
import { makeUnsubscribeToken, readUnsubscribeToken } from "./notify/token";
import { formatCurrency } from "./utils";
import { allocateInUnits, calculateSplit } from "./money";
import { currencyDigits, minorUnitCents } from "./currencies";
import { amountToInput, parseCents } from "./split-form";
import { aggregate, monthsBetween } from "./insights";

describe("recurrence date maths", () => {
  it("clamps month ends (Jan 31 -> Feb 28/29) without drifting", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(occurrenceDate("2026-01-31", "MONTHLY", 2)).toBe("2026-03-31");
    expect(occurrenceDate("2026-01-30", "MONTHLY", 1)).toBe("2026-02-28");
    expect(occurrenceDate("2026-08-31", "MONTHLY", 1)).toBe("2026-09-30");
    expect(occurrenceDate("2026-11-30", "MONTHLY", 3)).toBe("2027-02-28");
  });
  it("handles leap-day yearly", () => {
    expect(occurrenceDate("2028-02-29", "YEARLY", 1)).toBe("2029-02-28");
    expect(occurrenceDate("2028-02-29", "YEARLY", 4)).toBe("2032-02-29");
  });
  it("adds weeks across month and year ends", () => {
    expect(occurrenceDate("2026-12-28", "WEEKLY", 1)).toBe("2027-01-04");
    expect(occurrenceDate("2026-12-28", "BIWEEKLY", 2)).toBe("2027-01-25");
  });
  it("stops at the end date", () => {
    expect(nextOccurrence("2026-01-01", "MONTHLY", 2, "2026-03-01")).toBe("2026-03-01");
    expect(nextOccurrence("2026-01-01", "MONTHLY", 3, "2026-03-01")).toBeNull();
  });
  it("lists due occurrences up to today, capped", () => {
    expect(dueOccurrences("2026-01-31", "MONTHLY", 1, "2026-04-15")).toEqual([
      { index: 1, day: "2026-02-28" },
      { index: 2, day: "2026-03-31" },
    ]);
    expect(dueOccurrences("2026-01-01", "WEEKLY", 1, "2026-01-07")).toEqual([]);
    expect(dueOccurrences("2020-01-01", "WEEKLY", 1, "2026-01-01", null, 5)).toHaveLength(5);
    expect(dueOccurrences("2026-01-01", "WEEKLY", 1, "2026-12-31", "2026-01-20")).toHaveLength(2);
  });
  it("uses the user's time zone for today, UTC as fallback", () => {
    const now = new Date("2026-03-01T20:00:00Z");
    expect(todayIn("UTC", now)).toBe("2026-03-01");
    expect(todayIn("Asia/Jakarta", now)).toBe("2026-03-02");
    expect(todayIn("America/Los_Angeles", now)).toBe("2026-03-01");
    expect(todayIn("Not/AZone", now)).toBe("2026-03-01");
    expect(todayIn(null, now)).toBe("2026-03-01");
  });
  it("validates days", () => {
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2028-02-29")).toBe(true);
    expect(isDay("2026-13-01")).toBe(false);
  });
});

describe("currency conversion", () => {
  it("rounds to cents", () => {
    expect(convertCents(1000, 1.23456)).toBe(1235); // 10.00 * 1.23456 = 12.3456
    expect(convertCents(1, 0.5)).toBe(1); // half rounds up
    expect(convertCents(333, 0.1)).toBe(33);
  });
  it("rounds to whole units for zero-decimal targets", () => {
    // USD 12.34 at 16,250.5 IDR -> 200,531.17 -> IDR 200,531
    expect(convertCents(1234, 16250.5, 100)).toBe(20053100);
  });
  it("rejects bad rates", () => {
    expect(() => convertCents(100, 0)).toThrow();
    expect(() => convertCents(100, Number.NaN)).toThrow();
  });
  it("keeps converted payers and shares summing to the converted total", () => {
    const rows = {
      payers: [{ amountPaid: 10 }],
      splits: [{ amount: 3.33 }, { amount: 3.33 }, { amount: 3.34 }],
      items: [],
    };
    const out = convertRows(rows, 1000, 16250.5, 100);
    expect(out.totalCents).toBe(16250500);
    const sumSplits = out.rows.splits.reduce((s, x) => s + Math.round(x.amount * 100), 0);
    expect(sumSplits).toBe(out.totalCents);
    for (const s of out.rows.splits) expect(Math.round(s.amount * 100) % 100).toBe(0);
    expect(out.rows.payers[0].amountPaid).toBe(162505);
  });
  it("converts itemized rows item by item", () => {
    const rows = {
      payers: [{ amountPaid: 6 }, { amountPaid: 4 }],
      splits: [],
      items: [
        { amount: 7, splits: [{ amount: 3.5 }, { amount: 3.5 }] },
        { amount: 3, splits: [{ amount: 3 }] },
      ],
    };
    const out = convertRows(rows, 1000, 0.9);
    expect(out.totalCents).toBe(900);
    expect(out.rows.items.map((i) => i.amount)).toEqual([6.3, 2.7]);
    expect(out.rows.items[0].splits.map((s) => s.amount)).toEqual([3.15, 3.15]);
    expect(out.rows.payers.map((p) => p.amountPaid)).toEqual([5.4, 3.6]);
  });
  it("parses and describes rates", () => {
    expect(parseRate("16,250.5")).toBe(16250.5);
    expect(parseRate("0.000061")).toBe(0.000061);
    expect(parseRate("-1")).toBeNull();
    expect(parseRate("abc")).toBeNull();
    expect(parseRate("0")).toBeNull();
    expect(describeRate("USD", "IDR", 16250.5)).toBe("1 USD = 16,250.5 IDR");
  });
});

describe("money formatting by minor unit", () => {
  it("shows zero-decimal currencies without decimals", () => {
    expect(formatCurrency(900000, "IDR")).toMatch(/^IDR\s900,000$/);
    expect(formatCurrency(1500, "JPY")).toMatch(/^¥1,500$/);
    expect(formatCurrency(12000, "KRW")).toMatch(/^₩12,000$/);
    expect(formatCurrency(12.5, "USD")).toBe("$12.50");
    expect(formatCurrency(-12.5, "USD")).toBe("-$12.50");
  });
  it("knows each currency's unit", () => {
    expect(currencyDigits("IDR")).toBe(0);
    expect(currencyDigits("jpy")).toBe(0);
    expect(currencyDigits("USD")).toBe(2);
    expect(minorUnitCents("IDR")).toBe(100);
    expect(minorUnitCents("EUR")).toBe(1);
  });
  it("allocates zero-decimal splits in whole units", () => {
    const parts = allocateInUnits(10000000, [1, 1, 1], 100); // IDR 100,000 / 3
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000000);
    for (const p of parts) expect(p % 100).toBe(0);
    const split = calculateSplit(100000, [{ userId: "a" }, { userId: "b" }, { userId: "c" }], "EQUAL", minorUnitCents("IDR"));
    expect(split.map((s) => s.amount).sort()).toEqual([33333, 33333, 33334]);
  });
  it("parses zero-decimal input", () => {
    expect(parseCents("900.000", 0)).toBe(90000000);
    expect(parseCents("900,000", 0)).toBe(90000000);
    expect(parseCents("12.5", 2)).toBe(1250);
    expect(amountToInput(900000, 0)).toBe("900000");
  });
});

describe("WAHA WhatsApp adapter", () => {
  const cfg = { url: "https://waha.test", apiKey: "k-123", session: "default" };
  const ok = (body: unknown, status = 200) =>
    vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));

  it("is disabled without env", async () => {
    expect(wahaConfig({})).toBeNull();
    expect(wahaConfig({ WAHA_URL: "https://x" })).toBeNull();
    expect(isWhatsAppConfigured({ WAHA_URL: "https://x/", WAHA_API_KEY: "k" })).toBe(true);
    expect(wahaConfig({ WAHA_URL: "https://x/", WAHA_API_KEY: "k" })).toEqual({ url: "https://x", apiKey: "k", session: "default" });
    expect(wahaConfig({ WAHA_URL: "https://x", WAHA_API_KEY: "k", WAHA_SESSION: "fs" })?.session).toBe("fs");
    const f = vi.fn();
    const r = await sendWhatsAppText("+6281234567890", "hi", { config: null, fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ ok: false, error: "WhatsApp is not configured", notConfigured: true });
    expect(f).not.toHaveBeenCalled();
    const c = await checkWhatsAppNumber("+6281234567890", { config: null, fetchImpl: f as unknown as typeof fetch });
    expect(c.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("normalises numbers to chat ids", () => {
    expect(phoneDigits("+62 812-3456-7890")).toBe("6281234567890");
    expect(phoneDigits("0812")).toBeNull();
    expect(toChatId("+1 (415) 555-0100")).toBe("14155550100@c.us");
    expect(() => toChatId("12")).toThrow();
  });
  it("posts sendText with the documented payload and X-Api-Key", async () => {
    const f = ok({ id: "true_628@c.us_ABC" }, 201);
    const r = await sendWhatsAppText("+62 812 3456 7890", "Hello", { config: cfg, fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ ok: true, id: "true_628@c.us_ABC" });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://waha.test/api/sendText");
    expect(init.method).toBe("POST");
    const h = init.headers as Record<string, string>;
    expect(h["X-Api-Key"]).toBe("k-123");
    expect(h["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({ session: "default", chatId: "6281234567890@c.us", text: "Hello" });
  });
  it("reports HTTP errors with retryability", async () => {
    const r1 = await sendWhatsAppText("6281234567890", "x", { config: cfg, fetchImpl: ok({ message: "Session not found" }, 422) as unknown as typeof fetch });
    expect(r1).toEqual({ ok: false, error: "WAHA 422: Session not found", retryable: false });
    const r2 = await sendWhatsAppText("6281234567890", "x", { config: cfg, fetchImpl: ok("Bad gateway", 502) as unknown as typeof fetch });
    expect(r2).toMatchObject({ ok: false, retryable: true });
    const r3 = await sendWhatsAppText("6281234567890", "x", {
      config: cfg,
      fetchImpl: vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }) as unknown as typeof fetch,
    });
    expect(r3).toMatchObject({ ok: false, retryable: true, error: expect.stringContaining("ECONNREFUSED") });
    const bad = await sendWhatsAppText("12", "x", { config: cfg, fetchImpl: vi.fn() as unknown as typeof fetch });
    expect(bad).toEqual({ ok: false, error: "Invalid phone number" });
  });
  it("checks whether a number exists", async () => {
    const f = ok({ numberExists: true, chatId: "6281234567890@c.us" });
    const r = await checkWhatsAppNumber("+6281234567890", { config: cfg, fetchImpl: f as unknown as typeof fetch });
    expect(r).toEqual({ ok: true, exists: true, chatId: "6281234567890@c.us" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://waha.test/api/contacts/check-exists?phone=6281234567890&session=default");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("k-123");
    const no = await checkWhatsAppNumber("+6281234567890", { config: cfg, fetchImpl: ok({ numberExists: false }) as unknown as typeof fetch });
    expect(no).toEqual({ ok: true, exists: false, chatId: null });
  });
});

const act = (a: { type: ActivityLike["type"]; actorId: string; payload?: ActivityLike["payload"] }): ActivityLike => ({
  groupId: "g",
  expenseId: null,
  settlementId: null,
  targetUserId: null,
  payload: {},
  ...a,
});

describe("notification routing", () => {
  it("maps activity types to events", () => {
    expect(eventForActivity("EXPENSE_CREATED")).toBe("expense_added");
    expect(eventForActivity("PAYMENT_RECORDED")).toBe("payment");
    expect(eventForActivity("GROUP_RENAMED")).toBeNull();
  });
  it("never notifies the actor", () => {
    const r = recipientsFor(act({ type: "EXPENSE_CREATED", actorId: "a", payload: { impact: { a: 500, b: -250, c: -250 } } }));
    expect(r.sort()).toEqual(["b", "c"]);
    const pay = recipientsFor(act({ type: "PAYMENT_RECORDED", actorId: "a", payload: { fromId: "a", toId: "b" } }));
    expect(pay).toEqual(["b"]);
    expect(recipientsFor(act({ type: "COMMENT_ADDED", actorId: "a" }), { expensePeople: ["a", "b"] })).toEqual(["b"]);
  });
  it("only notifies edits to people whose share changed", () => {
    const r = recipientsFor(act({
      type: "EXPENSE_UPDATED",
      actorId: "a",
      payload: { previousImpact: { a: 600, b: -300, c: -300 }, impact: { a: 600, b: -200, c: -400 } },
    }));
    expect(r.sort()).toEqual(["b", "c"]);
    const same = recipientsFor(act({
      type: "EXPENSE_UPDATED",
      actorId: "a",
      payload: { previousImpact: { a: 600, b: -600 }, impact: { a: 600, b: -600 } },
    }));
    expect(same).toEqual([]);
  });
  it("respects preferences with defaults", () => {
    expect(wants([], "expense_added", "email")).toBe(true);
    expect(wants([{ event: "expense_added", email: false, whatsapp: false }], "expense_added", "email")).toBe(false);
  });
  it("signs unsubscribe tokens", () => {
    const t = makeUnsubscribeToken({ u: "u1", e: "payment", c: "email" }, "k");
    expect(readUnsubscribeToken(t, "k")).toEqual({ u: "u1", e: "payment", c: "email" });
    expect(readUnsubscribeToken(t, "other")).toBeNull();
    expect(readUnsubscribeToken(t.slice(0, -2) + "xx", "k")).toBeNull();
    expect(readUnsubscribeToken("garbage", "k")).toBeNull();
  });
});

describe("insights aggregation", () => {
  it("lists every month in range", () => {
    expect(monthsBetween("2025-11-15", "2026-02-01")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
  it("sums my share by category and month, per currency", () => {
    const d = (s: string) => new Date(`${s}T00:00:00Z`);
    const out = aggregate(
      [
        { currency: "IDR", category: "FOOD_DRINK", date: d("2026-01-05"), cents: 5000000 },
        { currency: "IDR", category: "FOOD_DRINK", date: d("2026-02-05"), cents: 2500000 },
        { currency: "IDR", category: null, date: d("2026-02-06"), cents: 1000000 },
        { currency: "USD", category: "TRAVEL", date: d("2026-01-09"), cents: 1250 },
        { currency: "USD", category: "TRAVEL", date: d("2026-01-09"), cents: 0 },
      ],
      "2026-01-01",
      "2026-03-31"
    );
    expect(out.map((c) => c.currency)).toEqual(["IDR", "USD"]);
    expect(out[0].totalCents).toBe(8500000);
    expect(out[0].byCategory).toEqual([
      { category: "FOOD_DRINK", label: "Food & drink", cents: 7500000 },
      { category: "OTHER", label: "Other", cents: 1000000 },
    ]);
    expect(out[0].byMonth.map((m) => m.cents)).toEqual([5000000, 3500000, 0]);
    expect(out[1].expenseCount).toBe(1);
  });
});
