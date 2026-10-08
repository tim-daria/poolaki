/** @file Home page figures: monthly totals, category split, recent rows and the closest goal. */

import { describe, expect, it } from "vitest";
import type { Category } from "./categories";
import type { Goal } from "./goals";
import {
  closestGoal,
  daysLeftInMonth,
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
    saved_amount: 1790,
    target_date: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
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

  it("snaps float sums to cents", () => {
    const rows = [tx({ amount: 0.1 }), tx({ amount: 0.2 })];
    expect(monthSummary(rows, "2026-08-01").expenses).toBe(0.3);
  });

  it("reports a negative remainder when overspent", () => {
    expect(monthSummary([tx({ amount: 50 })], "2026-08-01").left).toBe(-50);
  });
});

describe("daysLeftInMonth", () => {
  it("counts the days after today", () => {
    expect(daysLeftInMonth("2026-08-03")).toBe(28);
    expect(daysLeftInMonth("2026-08-31")).toBe(0);
  });

  it("handles February in leap years", () => {
    expect(daysLeftInMonth("2028-02-01")).toBe(28);
    expect(daysLeftInMonth("2026-02-01")).toBe(27);
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

  it("does not merge a single leftover category", () => {
    const rows = [1, 2, 3, 4].map((category) => tx({ category }));
    expect(spendingByCategory(rows, "2026-08-20", CATEGORIES, 3)).toHaveLength(
      4,
    );
    expect(
      spendingByCategory(rows, "2026-08-20", CATEGORIES, 3).some(
        (s) => s.label === "Other",
      ),
    ).toBe(false);
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
  it("goalPercent rounds and caps at 100", () => {
    expect(goalPercent(goal())).toBe(90);
    expect(goalPercent(goal({ saved_amount: 2500 }))).toBe(100);
  });

  it("closestGoal picks the smallest remainder among unfinished goals", () => {
    const goals = [
      goal({ id: 1, saved_amount: 2000 }),
      goal({ id: 2, saved_amount: 1000 }),
      goal({ id: 3, saved_amount: 1790 }),
    ];
    expect(closestGoal(goals)?.id).toBe(3);
    expect(closestGoal([goal({ saved_amount: 2000 })])).toBeUndefined();
  });
});
