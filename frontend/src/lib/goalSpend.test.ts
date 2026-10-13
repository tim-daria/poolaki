/** @file Expense split between a goal and the balance. */

import { describe, expect, it } from "vitest";
import { goalLeft, splitExpense, type ExpenseSplit } from "./goalSpend";

describe("goalLeft", () => {
  it.each([
    [40, 40],
    [0, 0],
    [-25, 0],
  ])("balance %i leaves %i to spend", (balance, left) => {
    expect(goalLeft({ balance })).toBe(left);
  });
});

describe("splitExpense", () => {
  it.each<[string, number, number, ExpenseSplit]>([
    [
      "the goal covers it",
      980,
      2000,
      { kind: "covered", fromGoal: 980, fromBalance: 0, leftAfter: 1020 },
    ],
    [
      "the goal covers it exactly",
      40,
      40,
      { kind: "covered", fromGoal: 40, fromBalance: 0, leftAfter: 0 },
    ],
    [
      "the goal runs out",
      260,
      40,
      { kind: "runs_out", fromGoal: 40, fromBalance: 220, leftAfter: -220 },
    ],
    [
      "the goal is empty",
      120,
      0,
      { kind: "empty", fromGoal: 0, fromBalance: 120, leftAfter: -120 },
    ],
    [
      "the goal is already overspent",
      120,
      -30,
      { kind: "empty", fromGoal: 0, fromBalance: 120, leftAfter: -150 },
    ],
  ])("splits when %s", (_, amount, balance, expected) => {
    expect(splitExpense(amount, balance)).toEqual(expected);
  });

  it("rounds to cents instead of drifting", () => {
    expect(splitExpense(0.1, 0.3)).toEqual({
      kind: "covered",
      fromGoal: 0.1,
      fromBalance: 0,
      leftAfter: 0.2,
    });
  });

  it("treats a zero amount as covered with nothing moved", () => {
    expect(splitExpense(0, 50)).toEqual({
      kind: "covered",
      fromGoal: 0,
      fromBalance: 0,
      leftAfter: 50,
    });
  });
});
