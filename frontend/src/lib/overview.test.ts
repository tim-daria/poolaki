/** @file Home page figures: monthly totals, category split, recent rows and the closest goal. */

import { describe, expect, it } from "vitest";
import type { Goal } from "./goals";
import {
  DEFAULT_SCALE_FLOOR,
  activeGoals,
  balanceChange,
  closestGoal,
  columnScaleMax,
  donutShares,
  monthFooter,
  shareLabel,
  goalPercent,
  monthSummary,
  recentTransactions,
  spendingByCategory,
  wholePercents,
} from "./overview";
import type { CategoryReport, YearlyReportResponse } from "./reports";
import type { Transaction } from "./transactions";

const ZERO_MONTHS = Array<string>(12).fill("0.00");

/** A category whose spending is `amount` in August and nothing elsewhere. */
function august(
  name: string,
  amount: number,
  type: CategoryReport["type"] = "expense",
): CategoryReport {
  const monthly = [...ZERO_MONTHS];
  monthly[7] = amount.toFixed(2);
  return { category_id: 0, name, type, total: monthly[7], monthly };
}

/** A year that is empty apart from what the overrides say. */
function report(
  overrides: Partial<YearlyReportResponse> = {},
): YearlyReportResponse {
  return {
    year: 2026,
    totals: { income: "0.00", expense: "0.00", goals_balance: "0.00" },
    monthly: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: "0.00",
      expense: "0.00",
      goals_balance: "0.00",
    })),
    categories: [],
    goal_balance: "0.00",
    goals: [],
    ...overrides,
  };
}

/** The report with August's income, expense and net savings set. */
function augustReport(
  income: number,
  expense: number,
  saved = 0,
): YearlyReportResponse {
  const r = report();
  r.monthly[7] = {
    month: 8,
    income: income.toFixed(2),
    expense: expense.toFixed(2),
    goals_balance: saved.toFixed(2),
  };
  return r;
}

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
  it("reads income and expenses from the report's month, savings from the rows", () => {
    const rows = [
      tx({ entry_type: "contribution", category: null, amount: 100 }),
      // Outside the month: ignored even if the caller fetched it.
      tx({
        entry_type: "contribution",
        category: null,
        amount: 999,
        transaction_date: "2026-07-31",
      }),
    ];
    expect(monthSummary(augustReport(3567, 1953), rows, "2026-08-03")).toEqual({
      income: 3567,
      expenses: 1953,
      saved: 100,
      left: 1514,
      inGoals: 0,
    });
  });

  it("reads the goal total from the report, whatever the month holds", () => {
    const r = report({ goal_balance: "1540.50" });
    expect(monthSummary(r, [], "2026-08-03").inGoals).toBe(1540.5);
  });

  it("counts a withdrawal against the saved total", () => {
    const rows = [
      tx({ entry_type: "contribution", category: null, amount: 300 }),
      tx({ entry_type: "withdraw", category: null, amount: 120 }),
    ];
    expect(monthSummary(augustReport(1000, 0), rows, "2026-08-03")).toEqual({
      income: 1000,
      expenses: 0,
      saved: 180,
      left: 820,
      inGoals: 0,
    });
  });

  it("snaps float sums to cents", () => {
    const rows = [
      tx({ entry_type: "contribution", amount: 0.1 }),
      tx({ entry_type: "contribution", amount: 0.2 }),
    ];
    expect(monthSummary(report(), rows, "2026-08-01").saved).toBe(0.3);
  });

  it("reports a negative remainder when overspent", () => {
    expect(monthSummary(augustReport(0, 50), [], "2026-08-01").left).toBe(-50);
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
  it("lists this month's expense categories, largest first", () => {
    const r = report({
      categories: [
        august("Groceries", 510.2),
        august("Housing", 1255),
        august("Salary", 5000, "income"),
        // Spent in another month only: not a slice this month.
        {
          ...august("Transport", 0),
          monthly: ["80.00", ...ZERO_MONTHS.slice(1)],
        },
      ],
    });
    expect(spendingByCategory(r, "2026-08-20")).toEqual([
      { label: "Housing", amount: 1255, percent: 71 },
      { label: "Groceries", amount: 510.2, percent: 29 },
    ]);
  });

  it("merges the tail into Other", () => {
    const r = report({
      categories: [
        "Groceries",
        "Dining",
        "Shopping",
        "Transport",
        "Housing",
      ].map((name, i) => august(name, (i + 1) * 10)),
    });
    const slices = spendingByCategory(r, "2026-08-20", 3);
    expect(slices.map((s) => s.label)).toEqual([
      "Housing",
      "Transport",
      "Shopping",
      "Other",
    ]);
    expect(slices[3].amount).toBe(30);
  });

  it("merges even a single leftover category, so the pie never exceeds maxSlices + 1", () => {
    const r = report({
      categories: ["Groceries", "Dining", "Shopping", "Transport"].map(
        (name, i) => august(name, (i + 1) * 10),
      ),
    });
    const slices = spendingByCategory(r, "2026-08-20", 3);
    expect(slices).toHaveLength(4);
    expect(slices[3]).toMatchObject({ label: "Other", amount: 10 });
  });

  it("breaks an equal-amount tie by name, whatever the report order", () => {
    const labels = (categories: CategoryReport[]) =>
      spendingByCategory(report({ categories }), "2026-08-20").map(
        (s) => s.label,
      );
    const dining = august("Dining", 50);
    const groceries = august("Groceries", 50);
    expect(labels([groceries, dining])).toEqual(["Dining", "Groceries"]);
    expect(labels([dining, groceries])).toEqual(["Dining", "Groceries"]);
  });

  it("is empty for a month without spending", () => {
    expect(spendingByCategory(report(), "2026-08-20")).toEqual([]);
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

describe("monthFooter", () => {
  const s = (income: number, expenses: number, saved: number) => ({
    income,
    expenses,
    saved,
    left: income - expenses - saved,
    inGoals: 0,
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

  it("balanceChange is this month's net, or null while the month is empty", () => {
    expect(
      balanceChange({
        income: 3000,
        expenses: 1000,
        saved: 386,
        left: 1614,
        inGoals: 0,
      }),
    ).toBe(1614);
    expect(
      balanceChange({ income: 0, expenses: 0, saved: 0, left: 0, inGoals: 0 }),
    ).toBeNull();
    // A month with only a withdrawal still moved the balance.
    expect(
      balanceChange({
        income: 0,
        expenses: 0,
        saved: -50,
        left: 50,
        inGoals: 0,
      }),
    ).toBe(50);
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
