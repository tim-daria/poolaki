/** @file Savings figures of the Reports page, read from the yearly report. */

import type {
  GoalReport,
  MonthlyReport,
  YearlyReportResponse,
} from "./reports";
import { parseMoney } from "./money";

/** Net transfers of the year. */
export function savingsTotal(totals: YearlyReportResponse["totals"]): number {
  return parseMoney(totals.goals_balance);
}

/** Index 0 is January; the report always sends the 12 months in order. */
export function savingsByMonth(monthly: MonthlyReport[]): number[] {
  return monthly.map((m) => parseMoney(m.goals_balance));
}

export interface GoalSavings {
  id: number;
  name: string;
  total: number;
}

/**
 * Net saved per goal in the year, largest first. Goals left at zero or less
 * are dropped: a share of the year's saving is what the list shows.
 */
export function savingsByGoal(goals: GoalReport[]): GoalSavings[] {
  return goals
    .map((g) => ({ id: g.goal_id, name: g.name, total: parseMoney(g.balance) }))
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total);
}
