/** @file Home page figures: monthly totals, category split, recent rows and the closest goal. */

import { describe, expect, it } from "vitest";
import type { Category } from "./categories";
import type { Goal } from "./goals";
import {
  DEFAULT_SCALE_FLOOR,
  activeGoals,
  balanceChange,
  closestGoal,
  columnScaleMax,
  donutShares,
  monthFooter,
  previousMonthOf,
  previousMonthSummary,
  shareLabel,
  goalPercent,
  monthSummary,
  recentTransactions,
  spendingByCategory,
  wholePercents,
} from "./overview";
import type { Transaction } from "./transactions";

const CATEGORIES: Category[] = [
  { id: 1, name: "Groceries", type: "expense" },
  { id: 2, name: "Dining", type: "expense" },
  { id: 3, name: "Shopping", type: "expense" },
  { id: 4, name: "Transport", type: "expense" },
  { id: 5, name: "Housing", type: "expense" },
];

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    entry_type: "expense",
    category: 1, // Groceries
    description: "Weekly shop",
    amount: 10,
    transaction_date: "2026-08-10",
    is_tax_deductible: false,
    goal: null,
    created_by: null,
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 1,
    name: "Trip",
    target_amount: 2000,
    balance: 1790,
    spendable: false,
    progress: 0.9,
    overdue: false,
    completed_at: null,
    created_by: "owner",
    target_date: null,
    status: "active",
    created_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("monthSummary", () => {
  it("totals only the current month, per entry type", () => {
    const rows = [
      tx({ entry_type: "income", amount: 3567 }),
      tx({ amount: 1953 }),
      tx({ entry_type: "contribution", category: null, amount: 100 }),
      tx({ amount: 999, transaction_date: "2026-07-31" }),
    ];
    expect(monthSummary(rows, "2026-08-03")).toEqual({
      income: 3567,
      expenses: 1953,
      saved: 100,
      left: 1514,
    });
  });

  it("counts a withdrawal against the saved total", () => {
    const rows = [
      tx({ entry_type: "income", amount: 1000 }),
      tx({ entry_type: "contribution", category: null, amount: 300 }),
      tx({ entry_type: "withdraw", category: null, amount: 120 }),
    ];
    expect(monthSummary(rows, "2026-08-03")).toEqual({
      income: 1000,
      expenses: 0,
      saved: 180,
      left: 820,
    });
  });

  it("snaps float sums to cents", () => {
    const rows = [tx({ amount: 0.1 }), tx({ amount: 0.2 })];
    expect(monthSummary(rows, "2026-08-01").expenses).toBe(0.3);
  });

  it("reports a negative remainder when overspent", () => {
    expect(monthSummary([tx({ amount: 50 })], "2026-08-01").left).toBe(-50);
  });
});

describe("wholePercents", () => {
  it("always sums to 100", () => {
    expect(wholePercents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(wholePercents([1255, 510.2, 187.8]).reduce((a, b) => a + b)).toBe(
      100,
    );
  });

  it("returns zeros for an empty total", () => {
    expect(wholePercents([0, 0])).toEqual([0, 0]);
  });

  it("never rounds a slice up to 100 while others have an amount", () => {
    expect(wholePercents([99999, 1, 1, 1])).toEqual([99, 0, 0, 0]);
    // Alone, or beside zero-amount slices, 100 is right.
    expect(wholePercents([5])).toEqual([100]);
    expect(wholePercents([5, 0])).toEqual([100, 0]);
  });
});

describe("spendingByCategory", () => {
  it("groups this month's expenses by category, largest first", () => {
    const rows = [
      tx({ category: 1, amount: 510.2 }),
      tx({ category: 5, amount: 1255 }),
      tx({ category: 1, amount: 0 }),
      tx({ entry_type: "income", category: 8, amount: 5000 }),
      tx({ category: 4, amount: 80, transaction_date: "2026-07-01" }),
    ];
    expect(spendingByCategory(rows, "2026-08-20", CATEGORIES)).toEqual([
      { label: "Housing", amount: 1255, percent: 71 },
      { label: "Groceries", amount: 510.2, percent: 29 },
    ]);
  });

  it("merges the tail into Other", () => {
    const rows = [1, 2, 3, 4, 5].map((category) =>
      tx({ category, amount: category * 10 }),
    );
    const slices = spendingByCategory(rows, "2026-08-20", CATEGORIES, 3);
    expect(slices.map((s) => s.label)).toEqual([
      "Housing",
      "Transport",
      "Shopping",
      "Other",
    ]);
    expect(slices[3].amount).toBe(30);
  });

  it("merges even a single leftover category, so the pie never exceeds maxSlices + 1", () => {
    const rows = [1, 2, 3, 4].map((category) =>
      tx({ category, amount: category * 10 }),
    );
    const slices = spendingByCategory(rows, "2026-08-20", CATEGORIES, 3);
    expect(slices).toHaveLength(4);
    expect(slices[3]).toMatchObject({ label: "Other", amount: 10 });
  });

  it("breaks an equal-amount tie by the earlier first expense, whatever the row order", () => {
    const later = tx({
      category: 2,
      amount: 50,
      transaction_date: "2026-08-10",
    });
    const earlier = tx({
      category: 1,
      amount: 50,
      transaction_date: "2026-08-03",
    });
    const labels = (rows: ReturnType<typeof tx>[]) =>
      spendingByCategory(rows, "2026-08-20", CATEGORIES).map((s) => s.label);
    expect(labels([later, earlier])).toEqual(["Groceries", "Dining"]);
    expect(labels([earlier, later])).toEqual(["Groceries", "Dining"]);
  });

  it("labels rows without a known category", () => {
    const [slice] = spendingByCategory(
      [tx({ category: null })],
      "2026-08-20",
      CATEGORIES,
    );
    expect(slice.label).toBe("Uncategorised");
  });
});

describe("recentTransactions", () => {
  it("orders by date, then by id, newest first", () => {
    const rows = [
      tx({ id: 1, transaction_date: "2026-08-04" }),
      tx({ id: 2, transaction_date: "2026-08-05" }),
      tx({ id: 3, transaction_date: "2026-08-05" }),
    ];
    expect(recentTransactions(rows, 2).map((t) => t.id)).toEqual([3, 2]);
  });
});

describe("goals", () => {
  it("goalPercent rounds and clamps to 0–100", () => {
    expect(goalPercent(goal())).toBe(90);
    expect(goalPercent(goal({ balance: 2500 }))).toBe(100);
    expect(goalPercent(goal({ balance: -340 }))).toBe(0);
  });

  it("closestGoal picks the highest saved-to-target ratio among active goals", () => {
    const goals = [
      goal({ id: 1, balance: 2000, status: "completed" }),
      goal({ id: 2, balance: 1000 }),
      goal({ id: 3, balance: 1790 }),
      // Less left to save than goal 3, but a lower ratio.
      goal({ id: 4, target_amount: 10000, balance: 9500 }),
    ];
    expect(closestGoal(goals)?.id).toBe(4);
    // Overdrawn counts as empty: it never beats a goal with money in it.
    expect(
      closestGoal([
        goal({ id: 1, balance: -340 }),
        goal({ id: 2, balance: 10 }),
      ])?.id,
    ).toBe(2);
    expect(
      closestGoal([goal({ balance: 2000, status: "completed" })]),
    ).toBeUndefined();
    expect(closestGoal([goal({ status: "archived" })])).toBeUndefined();
  });

  it("activeGoals drops completed and archived goals", () => {
    const goals = [
      goal({ id: 1 }),
      goal({ id: 2, balance: 2000, status: "completed" }),
      goal({ id: 3, status: "archived" }),
    ];
    expect(activeGoals(goals).map((g) => g.id)).toEqual([1]);
  });
});

describe("months", () => {
  it("previousMonthOf steps back across a year boundary", () => {
    expect(previousMonthOf("2026-08-20")).toBe("2026-07");
    expect(previousMonthOf("2026-01-05")).toBe("2025-12");
  });

  it("previousMonthSummary totals only the month before", () => {
    const rows = [
      tx({
        entry_type: "income",
        amount: 1000,
        transaction_date: "2026-07-03",
      }),
      tx({ amount: 250, transaction_date: "2026-07-20" }),
      tx({ amount: 999, transaction_date: "2026-08-01" }),
    ];
    expect(previousMonthSummary(rows, "2026-08-20")).toMatchObject({
      income: 1000,
      expenses: 250,
    });
  });
});

describe("monthFooter", () => {
  const s = (income: number, expenses: number, saved: number) => ({
    income,
    expenses,
    saved,
    left: income - expenses - saved,
  });

  it.each([
    [s(3567, 1712, 1455), { kind: "left", amount: 400 }],
    [s(100, 150, 0), { kind: "over", amount: 50 }],
    [s(0, 42, 0), { kind: "no-income", amount: 42 }],
    [s(0, 0, 0), { kind: "empty" }],
  ])("describes %j", (summary, expected) => {
    expect(monthFooter(summary)).toEqual(expected);
  });
});

describe("column scale and balance change", () => {
  it("columnScaleMax never drops below the floor", () => {
    expect(columnScaleMax([12, 3, 0], DEFAULT_SCALE_FLOOR)).toBe(1000);
    expect(columnScaleMax([1200, 3, 0], DEFAULT_SCALE_FLOOR)).toBe(1200);
    expect(columnScaleMax([500], 2500)).toBe(2500);
  });

  it("balanceChange is this month's net, only once history exists", () => {
    const thisMonth = [
      tx({
        entry_type: "income",
        amount: 3000,
        transaction_date: "2026-08-02",
      }),
      tx({ amount: 1000, transaction_date: "2026-08-10" }),
      tx({
        entry_type: "contribution",
        amount: 386,
        transaction_date: "2026-08-12",
      }),
    ];
    expect(balanceChange(thisMonth, "2026-08-20")).toBeNull();
    const withHistory = [...thisMonth, tx({ transaction_date: "2026-07-01" })];
    expect(balanceChange(withHistory, "2026-08-20")).toBe(1614);
  });
});

describe("donut", () => {
  it("donutShares lifts slivers to the minimum and renormalises", () => {
    const shares = donutShares([99, 1]);
    expect(shares[1]).toBeCloseTo(0.035 / 1.025, 5);
    expect(shares[0] + shares[1]).toBeCloseTo(1, 10);
  });

  it("donutShares leaves zero slices at zero", () => {
    expect(donutShares([50, 0])).toEqual([1, 0]);
    expect(donutShares([0, 0])).toEqual([0, 0]);
  });

  it("shareLabel says <1% rather than 0% for a real sliver", () => {
    expect(shareLabel({ label: "a", amount: 1, percent: 0 })).toBe("<1%");
    expect(shareLabel({ label: "a", amount: 0, percent: 0 })).toBe("0%");
    expect(shareLabel({ label: "a", amount: 47, percent: 47 })).toBe("47%");
  });
});
