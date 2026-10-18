/** @file How an expense paid from a goal splits between the goal and the general balance. Pure; the form previews it. */

import type { Goal } from "./goals";
import { toMoneyString } from "./money";

/**
 * "covered": the goal pays all of it. "runs_out": the goal pays what it has
 * and the balance pays the rest. "empty": the goal has nothing, so the balance
 * pays all of it, and the expense still counts against the goal.
 */
export type SplitKind = "covered" | "runs_out" | "empty";

export type ExpenseSplit = {
  kind: SplitKind;
  fromGoal: number;
  fromBalance: number;
  /** The goal's balance after this expense; negative is how far "over" it goes. */
  leftAfter: number;
};

/** What the goal can still pay. A negative balance is already overspent, so nothing. */
export function goalLeft(g: Pick<Goal, "balance">): number {
  return Math.max(0, g.balance);
}

/** Two-decimal arithmetic: amounts are cents, and float subtraction drifts. */
const cents = (n: number) => Number(toMoneyString(n));

/**
 * Splits `amount` across the goal and the balance. The server never splits
 * anything (an expense with a goal only moves the goal's balance), so this is
 * how the preview explains what the numbers will mean.
 */
export function splitExpense(amount: number, balance: number): ExpenseSplit {
  const left = goalLeft({ balance });
  const fromGoal = Math.min(amount, left);
  const kind: SplitKind =
    left === 0 ? "empty" : amount > left ? "runs_out" : "covered";
  return {
    kind,
    fromGoal: cents(fromGoal),
    fromBalance: cents(amount - fromGoal),
    leftAfter: cents(balance - amount),
  };
}
