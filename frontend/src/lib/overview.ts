/**
 * @file Home page figures derived from the workspace's transactions and goals:
 * the month's totals, spending split by category, recent entries and the goal
 * nearest completion. React-free so the arithmetic is unit-tested.
 */

import { categoryById, type Category } from "./categories";
import type { Goal } from "./goals";
import type { Transaction } from "./transactions";

/** Sums of floats drift (0.1 + 0.2); every total is snapped back to cents. */
function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "2026-08" for any ISO date in August 2026. */
function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/* ---------------------------------- */
/*           Monthly summary          */
/* ---------------------------------- */

export type MonthSummary = {
  income: number;
  expenses: number;
  /** Contributions to goals. */
  saved: number;
  /** Income not yet spent or moved to a goal; negative when overspent. */
  left: number;
};

/** Totals for the month `today` falls in. */
export function monthSummary(rows: Transaction[], today: string): MonthSummary {
  const month = monthOf(today);
  const totals = { income: 0, expense: 0, contribution: 0 };
  for (const t of rows) {
    if (monthOf(t.transaction_date) === month) totals[t.entry_type] += t.amount;
  }
  const income = cents(totals.income);
  const expenses = cents(totals.expense);
  const saved = cents(totals.contribution);
  return { income, expenses, saved, left: cents(income - expenses - saved) };
}

/** Days after `today` until the month ends, so the last day reports 0. */
export function daysLeftInMonth(today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return lastDay - d;
}

/* ---------------------------------- */
/*         Spending by category       */
/* ---------------------------------- */

export type SpendingSlice = {
  label: string;
  amount: number;
  percent: number;
};

/**
 * Whole percentages that always sum to 100, by the largest remainder method.
 * Plain rounding can total 99 or 101, which reads as a bug in a legend.
 */
export function wholePercents(amounts: number[]): number[] {
  const total = amounts.reduce((a, b) => a + b, 0);
  if (total <= 0) return amounts.map(() => 0);

  const exact = amounts.map((a) => (a / total) * 100);
  const result = exact.map(Math.floor);
  let missing = 100 - result.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((e, i) => ({ i, r: e - Math.floor(e) }))
    .sort((a, b) => b.r - a.r);
  for (const { i } of byRemainder) {
    if (missing-- <= 0) break;
    result[i]++;
  }
  return result;
}

/**
 * The month's expenses grouped by category, largest first. Beyond `maxSlices`
 * the tail is merged into "Other", since thin slices are unreadable in a pie.
 */
export function spendingByCategory(
  rows: Transaction[],
  today: string,
  categories: Category[],
  maxSlices = 3,
): SpendingSlice[] {
  const month = monthOf(today);
  const byLabel = new Map<string, number>();
  for (const t of rows) {
    if (t.entry_type !== "expense" || monthOf(t.transaction_date) !== month)
      continue;
    const label = categoryById(categories, t.category)?.name ?? "Uncategorised";
    byLabel.set(label, (byLabel.get(label) ?? 0) + t.amount);
  }

  const sorted = [...byLabel]
    .map(([label, amount]) => ({ label, amount: cents(amount) }))
    .sort((a, b) => b.amount - a.amount);

  // Merging a single leftover category would only rename it.
  const groups =
    sorted.length > maxSlices + 1
      ? [
          ...sorted.slice(0, maxSlices),
          {
            label: "Other",
            amount: cents(
              sorted.slice(maxSlices).reduce((sum, s) => sum + s.amount, 0),
            ),
          },
        ]
      : sorted;

  const percents = wholePercents(groups.map((g) => g.amount));
  return groups.map((g, i) => ({ ...g, percent: percents[i] }));
}

/* ---------------------------------- */
/*          Activity and goals        */
/* ---------------------------------- */

/** Newest first; same-day rows by id, so the latest entry leads. */
export function recentTransactions(
  rows: Transaction[],
  limit: number,
): Transaction[] {
  return [...rows]
    .sort(
      (a, b) =>
        b.transaction_date.localeCompare(a.transaction_date) || b.id - a.id,
    )
    .slice(0, limit);
}

/** Share of the target saved, as a whole percentage capped at 100. */
export function goalPercent(goal: Goal): number {
  if (goal.target_amount <= 0) return 100;
  return Math.min(
    100,
    Math.round((goal.saved_amount / goal.target_amount) * 100),
  );
}

/** The unfinished goal with the least left to save. */
export function closestGoal(goals: Goal[]): Goal | undefined {
  return goals
    .filter((g) => g.saved_amount < g.target_amount)
    .reduce<Goal | undefined>(
      (best, g) =>
        !best ||
        g.target_amount - g.saved_amount <
          best.target_amount - best.saved_amount
          ? g
          : best,
      undefined,
    );
}
