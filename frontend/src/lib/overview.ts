/**
 * @file Overview page figures derived from the yearly report, this month's
 * transfer rows and the goals: the month's totals and footer, the balance
 * change, the column scale, spending split by category with donut shares,
 * recent entries and the goal nearest completion. React-free so the
 * arithmetic is unit-tested.
 */

import { goalState, type Goal } from "./goals";
import { parseMoney } from "./money";
import type { YearlyReportResponse } from "./reports";
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
  /** Contributions to goals, net of withdrawals. */
  saved: number;
  /** Income not yet spent or moved to a goal; negative when overspent. */
  left: number;
};

/**
 * Totals for the month `today` falls in: income and expenses from the report,
 * savings from the month's transfer rows.
 */
export function monthSummary(
  report: YearlyReportResponse,
  rows: Transaction[],
  today: string,
): MonthSummary {
  const month = monthOf(today);
  const entry = report.monthly[Number(month.slice(5)) - 1];
  const income = parseMoney(entry.income);
  const expenses = parseMoney(entry.expense);

  // TODO(report): read these from the report once it carries transfer sums.
  let contribution = 0;
  let withdraw = 0;
  for (const t of rows) {
    if (monthOf(t.transaction_date) !== month) continue;
    if (t.entry_type === "contribution") contribution += t.amount;
    if (t.entry_type === "withdraw") withdraw += t.amount;
  }
  // A withdrawal moves goal money back, so it undoes saving.
  const saved = cents(contribution - withdraw);
  return { income, expenses, saved, left: cents(income - expenses - saved) };
}

/** What the summary's footer says; the component formats the amount. */
export type MonthFooter =
  | { kind: "left"; amount: number }
  | { kind: "over"; amount: number }
  | { kind: "no-income"; amount: number }
  | { kind: "empty" };

export function monthFooter(s: MonthSummary): MonthFooter {
  if (s.income > 0) {
    return s.left >= 0
      ? { kind: "left", amount: s.left }
      : { kind: "over", amount: -s.left };
  }
  if (s.expenses > 0) return { kind: "no-income", amount: s.expenses };
  return { kind: "empty" };
}

/** Column scale floor: a lone coffee is not a full column. */
export const DEFAULT_SCALE_FLOOR = 1000;

/** The value that fills a full-height column, never below `floor`. */
export function columnScaleMax(values: number[], floor: number): number {
  return Math.max(...values, floor);
}

/**
 * Change in balance since the first of the month: what the month's rows
 * added and removed. Null when nothing has happened this month yet, since a
 * change of nothing is not a change.
 */
export function balanceChange(s: MonthSummary): number | null {
  if (s.income === 0 && s.expenses === 0 && s.saved === 0) return null;
  return s.left;
}

/* ---------------------------------- */
/*         Spending by category       */
/* ---------------------------------- */

export type SpendingSlice = {
  label: string;
  amount: number;
  /** Whole-number share of the total; 0 for a share under half a percent. */
  percent: number;
};

/**
 * Whole percentages by the largest remainder method, so they sum to 100.
 * Plain rounding can total 99 or 101, which reads as a bug in a legend.
 *
 * One exception: a slice is never rounded up to 100 while another slice has
 * an amount. "100%" beside three "<1%" rows reads as a contradiction, so
 * the dominant slice stays at 99 and the column sums to 99 instead.
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
  const shared = amounts.filter((a) => a > 0).length > 1;
  for (const { i } of byRemainder) {
    if (missing <= 0) break;
    // Everything after it in remainder order is below one percent too, so
    // the spare point is dropped rather than handed down.
    if (shared && result[i] === 99) break;
    result[i]++;
    missing--;
  }
  return result;
}

/**
 * This month's expenses by category, largest first, read from the yearly
 * report. Beyond `maxSlices` the tail is merged into "Other", since thin
 * slices are unreadable in a chart. Equal amounts rank by name, so the order
 * does not depend on how the API happened to return the categories.
 */
export function spendingByCategory(
  report: YearlyReportResponse,
  today: string,
  maxSlices = 3,
): SpendingSlice[] {
  const index = Number(today.slice(5, 7)) - 1;
  const sorted = report.categories
    .filter((c) => c.type === "expense")
    .map((c) => ({ label: c.name, amount: parseMoney(c.monthly[index]) }))
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  const groups =
    sorted.length > maxSlices
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

/** Smallest share a non-zero segment is drawn at, so it stays visible. */
export const MIN_SEGMENT_SHARE = 3.5;

/**
 * Shares to draw each slice at, as fractions summing to 1. Every non-zero
 * slice is lifted to MIN_SEGMENT_SHARE percent before renormalising, so a 1%
 * category still shows as a sliver; the legend keeps the true figures.
 */
export function donutShares(amounts: number[]): number[] {
  const total = amounts.reduce((a, b) => a + b, 0);
  if (total <= 0) return amounts.map(() => 0);
  const lifted = amounts.map((a) =>
    a > 0 ? Math.max((a / total) * 100, MIN_SEGMENT_SHARE) : 0,
  );
  const liftedTotal = lifted.reduce((a, b) => a + b, 0);
  return lifted.map((l) => l / liftedTotal);
}

/** "47%", or "<1%" for a non-zero share that rounds to nothing. */
export function shareLabel(slice: SpendingSlice): string {
  return slice.amount > 0 && slice.percent === 0 ? "<1%" : `${slice.percent}%`;
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

/** Share of the target saved, as a whole percentage clamped to 0–100; an overdraft reads 0. */
export function goalPercent(goal: Goal): number {
  if (goal.target_amount <= 0) return 100;
  return Math.max(
    0,
    Math.min(100, Math.round((goal.balance / goal.target_amount) * 100)),
  );
}

/** Active status only; completed and archived goals are excluded. */
export function activeGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => goalState(g) === "active");
}

/** The active goal closest to completion: the highest saved-to-target ratio. An overdrawn goal counts as empty. */
export function closestGoal(goals: Goal[]): Goal | undefined {
  const ratio = (g: Goal) =>
    g.target_amount > 0 ? Math.max(0, g.balance) / g.target_amount : 0;
  return activeGoals(goals).reduce<Goal | undefined>(
    (best, g) => (!best || ratio(g) > ratio(best) ? g : best),
    undefined,
  );
}
