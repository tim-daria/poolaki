import { describe, expect, it } from "vitest";
import { savingsByGoal, savingsByMonth, savingsTotal } from "./savings";
import type { GoalReport, MonthlyReport } from "./reports";

const MONTHS_IN_YEAR = 12;
const ZERO = "0.00";

function month(index: number, goals_balance: string = ZERO): MonthlyReport {
  return { month: index + 1, income: ZERO, expense: ZERO, goals_balance };
}

function goal(goal_id: number, name: string, balance: string): GoalReport {
  return {
    goal_id,
    name,
    status: "active",
    target_amount: "1000.00",
    balance,
    monthly: new Array<string>(MONTHS_IN_YEAR).fill(ZERO),
  };
}

describe("savingsTotal", () => {
  it.each([
    ["689.75", 689.75],
    [ZERO, 0],
    ["-20.00", -20],
  ])("parses goals_balance %s as %d", (goals_balance, expected) => {
    expect(savingsTotal({ income: ZERO, expense: ZERO, goals_balance })).toBe(
      expected,
    );
  });
});

describe("savingsByMonth", () => {
  it("returns twelve zeroes for an empty year", () => {
    const monthly = Array.from({ length: MONTHS_IN_YEAR }, (_, i) => month(i));
    expect(savingsByMonth(monthly)).toEqual(new Array(MONTHS_IN_YEAR).fill(0));
  });

  it("keeps the month order, January first", () => {
    const monthly = Array.from({ length: MONTHS_IN_YEAR }, (_, i) =>
      month(i, i === 0 ? "150.50" : i === 4 ? "-30.00" : ZERO),
    );
    const months = savingsByMonth(monthly);
    expect(months[0]).toBe(150.5);
    expect(months[4]).toBe(-30);
    expect(months).toHaveLength(MONTHS_IN_YEAR);
  });
});

describe("savingsByGoal", () => {
  it("lists goals by their balance, largest first", () => {
    const goals = [
      goal(1, "Emergency fund", "300.00"),
      goal(2, "New laptop", "800.00"),
    ];
    expect(savingsByGoal(goals)).toEqual([
      { id: 2, name: "New laptop", total: 800 },
      { id: 1, name: "Emergency fund", total: 300 },
    ]);
  });

  it.each([
    ["zero", ZERO],
    ["negative", "-25.00"],
  ])("drops a goal whose balance is %s", (_, balance) => {
    expect(savingsByGoal([goal(1, "Emergency fund", balance)])).toEqual([]);
  });

  it("returns an empty list without goals", () => {
    expect(savingsByGoal([])).toEqual([]);
  });
});
