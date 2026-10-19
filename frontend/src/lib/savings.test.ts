import { describe, expect, it } from "vitest";
import {
  savingsByGoal,
  savingsByMonth,
  savingsTotal,
  type Transfer,
} from "./savings";
import type { Goal } from "./goals";

const YEAR = 2026;

function transfer(
  entry_type: "contribution" | "withdraw",
  amount: number,
  transaction_date: string,
  goal: number | null = 1,
): Transfer {
  return { entry_type, amount, transaction_date, goal };
}

function goal(id: number, name: string): Goal {
  return { id, name } as Goal;
}

describe("savingsByMonth", () => {
  it("returns twelve zeroes without transfers", () => {
    expect(savingsByMonth([], YEAR)).toEqual(new Array(12).fill(0));
  });

  it("sums contributions into the month they fall in", () => {
    const rows = [
      transfer("contribution", 100, "2026-01-10"),
      transfer("contribution", 50.5, "2026-01-20"),
      transfer("contribution", 20, "2026-03-01"),
    ];
    const months = savingsByMonth(rows, YEAR);
    expect(months[0]).toBe(150.5);
    expect(months[2]).toBe(20);
  });

  it("subtracts withdrawals from their month", () => {
    const rows = [
      transfer("contribution", 100, "2026-05-01"),
      transfer("withdraw", 30, "2026-05-20"),
    ];
    expect(savingsByMonth(rows, YEAR)[4]).toBe(70);
  });

  it("ignores rows from another year", () => {
    const rows = [transfer("contribution", 100, "2025-01-10")];
    expect(savingsByMonth(rows, YEAR)).toEqual(new Array(12).fill(0));
  });
});

describe("savingsTotal", () => {
  it("is zero without transfers", () => {
    expect(savingsTotal([])).toBe(0);
  });

  it("is contributions minus withdrawals", () => {
    const rows = [
      transfer("contribution", 800, "2026-02-01"),
      transfer("withdraw", 110.25, "2026-09-05"),
    ];
    expect(savingsTotal(rows)).toBe(689.75);
  });
});

describe("savingsByGoal", () => {
  const goals = [goal(1, "Emergency fund"), goal(2, "New laptop")];

  it("nets each goal and sorts by the largest", () => {
    const rows = [
      transfer("contribution", 300, "2026-01-01", 1),
      transfer("contribution", 900, "2026-01-01", 2),
      transfer("withdraw", 100, "2026-02-01", 2),
    ];
    expect(savingsByGoal(rows, goals)).toEqual([
      { id: 2, name: "New laptop", total: 800 },
      { id: 1, name: "Emergency fund", total: 300 },
    ]);
  });

  it("drops a goal whose withdrawals cancel its contributions", () => {
    const rows = [
      transfer("contribution", 100, "2026-01-01", 1),
      transfer("withdraw", 100, "2026-02-01", 1),
    ];
    expect(savingsByGoal(rows, goals)).toEqual([]);
  });

  it("names a goal that is no longer in the list", () => {
    const rows = [transfer("contribution", 40, "2026-01-01", 99)];
    expect(savingsByGoal(rows, goals)).toEqual([
      { id: 99, name: "Removed goal", total: 40 },
    ]);
  });

  it("ignores a row with no goal", () => {
    expect(savingsByGoal([transfer("contribution", 40, "2026-01-01", null)], goals)).toEqual([]);
  });
});
