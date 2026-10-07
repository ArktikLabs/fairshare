import { describe, expect, it } from "vitest";
import { allocateCents, assertPayersMatchTotal, calculateSplit } from "./money";
import { calculateGroupBalances, optimizeSettlements } from "./settlement-utils";

const sum = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;

describe("allocateCents", () => {
  it("always sums to the total", () => {
    expect(allocateCents(10000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
    expect(allocateCents(1, [1, 1, 1])).toEqual([1, 0, 0]);
    expect(allocateCents(0, [1, 2])).toEqual([0, 0]);
  });
  it("rejects zero weights", () => {
    expect(() => allocateCents(100, [0, 0])).toThrow();
  });
});

describe("calculateSplit", () => {
  const p = (ids: string[]) => ids.map((userId) => ({ userId }));

  it("EQUAL split of 100 between 3 keeps every cent", () => {
    const r = calculateSplit(100, p(["a", "b", "c"]), "EQUAL");
    expect(r.map((x) => x.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(sum(r.map((x) => x.amount))).toBe(100);
  });

  it("PERCENTAGE must total 100 and keeps every cent", () => {
    const r = calculateSplit(10, [
      { userId: "a", percentage: 33.33 },
      { userId: "b", percentage: 33.33 },
      { userId: "c", percentage: 33.34 },
    ], "PERCENTAGE");
    expect(sum(r.map((x) => x.amount))).toBe(10);
    expect(() => calculateSplit(10, [{ userId: "a", percentage: 50 }], "PERCENTAGE")).toThrow(/100%/);
  });

  it("SHARES split 2:1", () => {
    const r = calculateSplit(300000, [
      { userId: "a", shares: 2 },
      { userId: "b", shares: 1 },
    ], "SHARES");
    expect(r.map((x) => x.amount)).toEqual([200000, 100000]);
    expect(() => calculateSplit(1, [{ userId: "a", shares: 0 }], "SHARES")).toThrow();
  });

  it("EXACT must match the total to the cent", () => {
    expect(() =>
      calculateSplit(10, [{ userId: "a", amount: 3 }, { userId: "b", amount: 6.99 }], "EXACT")
    ).toThrow(/EXACT/);
    const r = calculateSplit(10, [{ userId: "a", amount: 3 }, { userId: "b", amount: 7 }], "EXACT");
    expect(r.map((x) => x.amount)).toEqual([3, 7]);
  });

  it("rejects duplicate participants", () => {
    expect(() => calculateSplit(10, p(["a", "a"]), "EQUAL")).toThrow(/once/);
  });
});

describe("assertPayersMatchTotal", () => {
  it("compares in cents", () => {
    expect(() => assertPayersMatchTotal(0.3, [0.1, 0.2])).not.toThrow();
    expect(() => assertPayersMatchTotal(10, [9.99])).toThrow();
  });
});

describe("group balances and settlements", () => {
  const members = ["a", "b", "c"].map((id) => ({
    user: { id, name: id.toUpperCase(), email: `${id}@x.test` },
  }));

  it("counts itemized splits, simple splits and recorded payments", () => {
    const balances = calculateGroupBalances(
      members,
      [
        // A pays 300 split equally a/b/c
        { payers: [{ userId: "a", amountPaid: 300 }], splits: ["a", "b", "c"].map((userId) => ({ userId, amount: 100 })) },
        // B pays 50 itemized: 30 for A, 20 shared A/B
        {
          payers: [{ userId: "b", amountPaid: 50 }],
          splits: [],
          items: [
            { splits: [{ userId: "a", amount: 30 }] },
            { splits: [{ userId: "a", amount: 10 }, { userId: "b", amount: 10 }] },
          ],
        },
      ],
      // C already paid A 40
      [{ payerId: "c", payeeId: "a", amount: 40 }]
    );
    const by = Object.fromEntries(balances.map((b) => [b.userId, b.netBalance]));
    expect(by).toEqual({ a: 120, b: -60, c: -60 });
    expect(sum(Object.values(by))).toBe(0);

    const s = optimizeSettlements(balances, "IDR");
    expect(s).toHaveLength(2);
    expect(sum(s.map((x) => x.amount))).toBe(120);
    expect(s.every((x) => x.toUserId === "a")).toBe(true);
  });

  it("keeps users who left the group in the books", () => {
    const balances = calculateGroupBalances(
      members.slice(0, 1),
      [{ payers: [{ userId: "a", amountPaid: 10 }], splits: [{ userId: "z", amount: 10 }] }]
    );
    expect(balances.find((b) => b.userId === "z")?.netBalance).toBe(-10);
    expect(balances.find((b) => b.userId === "z")?.name).toBe("Former member");
  });

  it("settles exactly with three-way cents", () => {
    const balances = calculateGroupBalances(members, [
      {
        payers: [{ userId: "a", amountPaid: 100 }],
        splits: calculateSplit(100, ["a", "b", "c"].map((userId) => ({ userId })), "EQUAL"),
      },
    ]);
    const s = optimizeSettlements(balances);
    expect(sum(s.map((x) => x.amount))).toBe(66.66);
  });
});
