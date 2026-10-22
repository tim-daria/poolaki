/** @file Savings figures derived from transfer rows, until the report carries contribution sums itself. */

import type { Transaction } from "./transactions";
import type { Goal } from "./goals";

/** The fields of a transfer row these figures need. */
export type Transfer = Pick<
  Transaction,
  "entry_type" | "amount" | "transaction_date" | "goal"
>;

const MONTHS_IN_YEAR = 12;

function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A withdrawal moves goal money back, so it undoes saving. */
function signedAmount(t: Transfer): number {
  return t.entry_type === "withdraw" ? -t.amount : t.amount;
}

/** Index 0 is January. Months with no transfers are 0. */
export function savingsByMonth(rows: Transfer[], year: number): number[] {
  const months = new Array<number>(MONTHS_IN_YEAR).fill(0);
  for (const t of rows) {
    const date = t.transaction_date;
    if (Number(date.slice(0, 4)) !== year) continue;
    const index = Number(date.slice(5, 7)) - 1;
    if (index < 0 || index >= MONTHS_IN_YEAR) continue;
    months[index] += signedAmount(t);
  }
  return months.map(cents);
}

export function savingsTotal(rows: Transfer[]): number {
  return cents(rows.reduce((sum, t) => sum + signedAmount(t), 0));
}

export interface GoalSavings {
  id: number;
  name: string;
  total: number;
}

/**
 * Net saved per goal, largest first. Goals left at zero or less are dropped:
 * a share of the year's saving is what the list shows.
 */
export function savingsByGoal(rows: Transfer[], goals: Goal[]): GoalSavings[] {
  const names = new Map(goals.map((g) => [g.id, g.name]));
  const totals = new Map<number, number>();
  for (const t of rows) {
    if (t.goal === null) continue;
    totals.set(t.goal, (totals.get(t.goal) ?? 0) + signedAmount(t));
  }
  return [...totals]
    .map(([id, total]) => ({
      id,
      name: names.get(id) ?? "Removed goal",
      total: cents(total),
    }))
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total);
}
