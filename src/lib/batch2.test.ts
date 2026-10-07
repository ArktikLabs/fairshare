import { describe, expect, it } from "vitest";
import { calculateGroupBalances, calculateGroupSettlements, pairwiseSettlements } from "./settlement-utils";
import { calendarDay, computeExpenseRows, diffExpense, expenseImpact, summarizeExpense } from "./expense-compute";
import {
  canManageExpense,
  canManagePayment,
  currencyChangeBlocker,
  deleteGroupBlocker,
  isGroupOwner,
  leaveGroupBlocker,
  withinRestoreWindow,
} from "./permissions";
import { describeActivity, joinList, type ActivityLike } from "./activity-format";

const members = ["a", "b", "c"].map((id) => ({ user: { id, name: id.toUpperCase(), email: `${id}@x.test` } }));
const cents = (n: number) => Math.round(n * 100);

// A paid 30 for A,B,C; B paid 30 for A,B,C... chain: A lends B, B lends C
const chain = [
  { payers: [{ userId: "a", amountPaid: 20 }], splits: [{ userId: "a", amount: 10 }, { userId: "b", amount: 10 }] },
  { payers: [{ userId: "b", amountPaid: 20 }], splits: [{ userId: "b", amount: 10 }, { userId: "c", amount: 10 }] },
];

describe("simplify debts", () => {
  it("on: chain A<-B<-C collapses to one payment C->A", () => {
    const r = calculateGroupSettlements("g", "USD", members, chain, [], [], { simplify: true });
    expect(r.suggestedSettlements.map((s) => [s.fromUserId, s.toUserId, s.amount])).toEqual([["c", "a", 10]]);
    expect(r.simplify).toBe(true);
  });

  it("off: keeps the direct debts B->A and C->B", () => {
    const r = calculateGroupSettlements("g", "USD", members, chain, [], [], { simplify: false });
    const got = r.suggestedSettlements.map((s) => [s.fromUserId, s.toUserId, s.amount]).sort();
    expect(got).toEqual([["b", "a", 10], ["c", "b", 10]]);
    expect(r.simplify).toBe(false);
  });

  it("defaults to simplified", () => {
    expect(calculateGroupSettlements("g", "USD", members, chain).suggestedSettlements).toHaveLength(1);
  });

  it("off: debts between the same two people are netted", () => {
    const ex = [
      { payers: [{ userId: "a", amountPaid: 30 }], splits: [{ userId: "a", amount: 15 }, { userId: "b", amount: 15 }] },
      { payers: [{ userId: "b", amountPaid: 10 }], splits: [{ userId: "a", amount: 5 }, { userId: "b", amount: 5 }] },
    ];
    const bal = calculateGroupBalances(members, ex);
    expect(pairwiseSettlements(bal, ex).map((s) => [s.fromUserId, s.toUserId, s.amount])).toEqual([["b", "a", 10]]);
  });

  it("off: payments reduce the pair's debt, and each person's total matches the ledger", () => {
    const ex = [
      { payers: [{ userId: "a", amountPaid: 100 }], splits: ["a", "b", "c"].map((userId, i) => ({ userId, amount: [33.34, 33.33, 33.33][i] })) },
      { payers: [{ userId: "c", amountPaid: 50 }], items: [{ splits: [{ userId: "b", amount: 25 }, { userId: "c", amount: 25 }] }], splits: [] },
    ];
    const pay = [{ payerId: "b", payeeId: "a", amount: 10 }];
    const bal = calculateGroupBalances(members, ex, pay);
    const s = pairwiseSettlements(bal, ex, pay);
    // Sum of suggestions per person equals their net balance, in cents
    for (const b of bal) {
      const net = s.reduce((t, x) => t + (x.toUserId === b.userId ? cents(x.amount) : 0) - (x.fromUserId === b.userId ? cents(x.amount) : 0), 0);
      expect(net).toBe(cents(b.netBalance));
    }
    expect(s.find((x) => x.fromUserId === "b" && x.toUserId === "a")?.amount).toBe(23.33);
  });

  it("off: a payment larger than the debt flips the direction", () => {
    const ex = [chain[0]];
    const pay = [{ payerId: "b", payeeId: "a", amount: 15 }];
    const s = pairwiseSettlements(calculateGroupBalances(members, ex, pay), ex, pay);
    expect(s.map((x) => [x.fromUserId, x.toUserId, x.amount])).toEqual([["a", "b", 5]]);
  });
});

describe("edit recompute", () => {
  const base = { amount: 90, payers: [{ userId: "a", amountPaid: 90 }], splitMethod: "EQUAL" as const, participants: [{ userId: "a" }, { userId: "b" }, { userId: "c" }] };

  it("recomputes equal shares when the amount changes", () => {
    const before = computeExpenseRows(base);
    expect(before.splits.map((s) => s.amount)).toEqual([30, 30, 30]);
    const after = computeExpenseRows({ ...base, amount: 100, payers: [{ userId: "a", amountPaid: 100 }] });
    expect(after.splits.map((s) => s.amount)).toEqual([33.34, 33.33, 33.33]);
  });

  it("rejects payers that no longer add up after an amount change", () => {
    expect(() => computeExpenseRows({ ...base, amount: 100 })).toThrow(/payer/i);
  });

  it("switching to itemized replaces the splits with item splits", () => {
    const r = computeExpenseRows({
      amount: 50,
      payers: [{ userId: "b", amountPaid: 50 }],
      items: [
        { name: "Pizza", amount: 30, quantity: 1, isShared: true, splitMethod: "EQUAL", participants: [{ userId: "a" }, { userId: "b" }] },
        { name: "Beer", amount: 20, quantity: 1, isShared: false, splitMethod: "EQUAL", participants: [{ userId: "c" }] },
      ],
    });
    expect(r.splits).toEqual([]);
    expect(r.items.map((i) => i.splits.map((s) => [s.userId, s.amount]))).toEqual([[["a", 15], ["b", 15]], [["c", 20]]]);
    expect(() => computeExpenseRows({ amount: 60, payers: [{ userId: "b", amountPaid: 60 }], items: r.items.map((i) => ({ ...i, participants: i.splits })) })).toThrow(/item/);
  });

  it("diff names exactly what changed", () => {
    const mk = (amount: number, people: string[], desc = "Dinner") =>
      summarizeExpense({
        description: desc,
        amount,
        category: "FOOD_DRINK",
        date: "2026-10-01",
        notes: null,
        splitMethod: "EQUAL",
        payers: [{ userId: "a", amountPaid: amount }],
        splits: computeExpenseRows({ amount, payers: [{ userId: "a", amountPaid: amount }], splitMethod: "EQUAL", participants: people.map((userId) => ({ userId })) }).splits,
        items: [],
      });
    expect(diffExpense(mk(90, ["a", "b", "c"]), mk(100, ["a", "b", "c"]))).toEqual([{ field: "amount", from: 9000, to: 10000 }]);
    expect(diffExpense(mk(90, ["a", "b", "c"]), mk(90, ["a", "b"])).map((c) => c.field)).toEqual(["split"]);
    expect(diffExpense(mk(90, ["a", "b"]), mk(90, ["a", "b"], "Lunch"))).toEqual([{ field: "description", from: "Dinner", to: "Lunch" }]);
    expect(diffExpense(mk(90, ["a", "b"]), mk(90, ["a", "b"]))).toEqual([]);
    expect(expenseImpact(mk(90, ["a", "b", "c"]))).toEqual({ a: 6000, b: -3000, c: -3000 });
  });
});

describe("calendarDay", () => {
  it("keeps form dates (UTC midnight) as picked", () => {
    expect(calendarDay(new Date("2026-10-07T00:00:00.000Z"))).toBe("2026-10-07");
  });
  it("reads timestamps in local time, like the date shown on screen", () => {
    const d = new Date(2026, 9, 8, 3, 29);
    expect(calendarDay(d)).toBe("2026-10-08");
  });
});

describe("permissions", () => {
  const exp = { userId: "u", createdById: "x", payerIds: ["p"], role: null, archived: false };
  it("expense: creator, payer or admin; never in archived groups", () => {
    expect(canManageExpense({ ...exp })).toBe(false);
    expect(canManageExpense({ ...exp, createdById: "u" })).toBe(true);
    expect(canManageExpense({ ...exp, payerIds: ["u"] })).toBe(true);
    expect(canManageExpense({ ...exp, role: "ADMIN" as const })).toBe(true);
    expect(canManageExpense({ ...exp, role: "OWNER" as const })).toBe(true);
    expect(canManageExpense({ ...exp, role: "MEMBER" as const })).toBe(false);
    expect(canManageExpense({ ...exp, createdById: "u", archived: true })).toBe(false);
  });
  it("payment: payer, receiver or admin", () => {
    const p = { userId: "u", payerId: "a", payeeId: "b", role: "MEMBER" as const, archived: false };
    expect(canManagePayment(p)).toBe(false);
    expect(canManagePayment({ ...p, payerId: "u" })).toBe(true);
    expect(canManagePayment({ ...p, payeeId: "u" })).toBe(true);
    expect(canManagePayment({ ...p, role: "ADMIN" })).toBe(true);
    expect(canManagePayment({ ...p, role: "ADMIN", archived: true })).toBe(false);
  });
  it("restore window is 30 days", () => {
    const now = new Date("2026-10-31T00:00:00Z");
    expect(withinRestoreWindow(new Date("2026-10-02T00:00:00Z"), now)).toBe(true);
    expect(withinRestoreWindow(new Date("2026-09-30T00:00:00Z"), now)).toBe(false);
    expect(withinRestoreWindow(null, now)).toBe(true);
  });
  it("currency changes only before any expense or payment", () => {
    expect(currencyChangeBlocker(0, 0)).toBeNull();
    expect(currencyChangeBlocker(1, 0)).toMatch(/no expenses/);
    expect(currencyChangeBlocker(0, 2)).toMatch(/no expenses/);
  });
  it("delete group: owner only, all settled", () => {
    expect(isGroupOwner({ userId: "u", createdBy: "u", role: "ADMIN" })).toBe(true);
    expect(isGroupOwner({ userId: "u", createdBy: "x", role: "ADMIN" })).toBe(false);
    expect(isGroupOwner({ userId: "u", createdBy: "x", role: "OWNER" })).toBe(true);
    expect(deleteGroupBlocker({ isOwner: false, unsettledCents: [] })).toMatch(/owner/);
    expect(deleteGroupBlocker({ isOwner: true, unsettledCents: [0, 100, -100] })).toMatch(/Settle/);
    expect(deleteGroupBlocker({ isOwner: true, unsettledCents: [0, 0] })).toBeNull();
  });
  it("leave group: settled, and not the last admin", () => {
    expect(leaveGroupBlocker({ balanceCents: 5, isAdmin: false, adminCount: 2 })).toMatch(/Settle/);
    expect(leaveGroupBlocker({ balanceCents: 0, isAdmin: true, adminCount: 1 })).toMatch(/last admin/);
    expect(leaveGroupBlocker({ balanceCents: 0, isAdmin: true, adminCount: 2 })).toBeNull();
    expect(leaveGroupBlocker({ balanceCents: 0, isAdmin: false, adminCount: 1 })).toBeNull();
  });
});

describe("activity lines", () => {
  const a = (over: Partial<ActivityLike>): ActivityLike => ({
    type: "EXPENSE_CREATED",
    actorId: "ani",
    groupId: "g",
    expenseId: "e",
    settlementId: null,
    targetUserId: null,
    payload: { actorName: "Ani", groupName: "Bali trip", currency: "USD", description: "Dinner", amount: 7500, impact: { ani: 5000, me: -2500, c: -2500 } },
    ...over,
  });
  it("tells the reader what they owe", () => {
    const l = describeActivity(a({}), "me");
    expect(l.text).toBe('Ani added "Dinner" in Bali trip');
    expect(l.detail).toEqual({ text: "you owe $25.00", tone: "negative" });
    expect(l.href).toBe("/expenses/e");
  });
  it("uses 'You' for the actor and hides the group on group pages", () => {
    const l = describeActivity(a({}), "ani", { showGroup: false });
    expect(l.text).toBe('You added "Dinner"');
    expect(l.detail?.text).toBe("you get back $50.00");
  });
  it("lists edit changes", () => {
    const l = describeActivity(
      a({ type: "EXPENSE_UPDATED", payload: { actorName: "Ani", currency: "USD", description: "Dinner", changes: [{ field: "amount", from: 5000, to: 7500 }, { field: "split" }] } }),
      "me"
    );
    expect(l.text).toBe('Ani edited "Dinner": amount $50.00 → $75.00 and the split');
  });
  it("describes payments from the reader's side", () => {
    const base = { type: "PAYMENT_RECORDED" as const, expenseId: null, settlementId: "s" };
    const l = describeActivity(a({ ...base, actorId: "me", payload: { actorName: "Me", currency: "IDR", amount: 1000000, fromId: "me", fromName: "Me", toId: "ani", toName: "Ani" } }), "me", { showGroup: false });
    expect(l.text).toMatch(/^You paid Ani IDR\s10,000\.00$/);
    const l2 = describeActivity(a({ ...base, actorId: "ani", payload: { actorName: "Ani", currency: "USD", amount: 500, fromId: "b", fromName: "Budi", toId: "me", toName: "Me" } }), "me", { showGroup: false });
    expect(l2.text).toBe("Ani recorded a payment: Budi paid you $5.00");
    expect(l2.detail?.text).toBe("you received $5.00");
  });
  it("joins lists in plain English", () => {
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b", "c"])).toBe("a, b and c");
  });
});
