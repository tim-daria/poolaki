/** @file How an entry type is shown wherever transactions are listed: sign, colours, category label and subtitle. */

import { categoryById, type Category } from "./categories";
import { goalById, isArchived, type Goal } from "./goals";
import type { EntryType, Transaction } from "./transactions";

/**
 * Expenses stay neutral; income is green with a plus. A transfer is drawn as
 * an arrow into or out of savings, never as spending or earning: a
 * contribution points in, a withdrawal points out in the lighter lavender.
 * Values are theme palette paths for `sx`.
 */
export const ENTRY_STYLE: Record<
  EntryType,
  { sign: string; chipBg: string; color: string; chipColor?: string }
> = {
  expense: { sign: "-", chipBg: "action.selected", color: "text.primary" },
  income: { sign: "+", chipBg: "success.light", color: "success.main" },
  contribution: { sign: "→", chipBg: "primary.light", color: "accent.main" },
  withdraw: {
    sign: "←",
    chipBg: "primary.light",
    color: "secondary.light",
    chipColor: "accent.main",
  },
};

/**
 * Contributions are filed under "Savings"; a withdrawal carries no category
 * at all, on the wire or here. Null for a removed or unknown category.
 */
export function entryCategoryLabel(
  t: Transaction,
  categories: Category[],
): string | null {
  if (t.entry_type === "contribution") return "Savings";
  if (t.entry_type === "withdraw") return "Withdraw";
  return categoryById(categories, t.category)?.name ?? null;
}

/**
 * The line under a row's name. An expense paid from a goal names the goal.
 * An archived goal accepts nothing, so a transfer on one can only be the
 * archive's own row: the contribution that settled an overdraft, or the
 * withdrawal that returned what was left. Null for every other row.
 */
export function entrySubtitle(t: Transaction, goals: Goal[]): string | null {
  const goal = goalById(goals, t.goal);
  if (!goal) return null;
  if (t.entry_type === "expense") return `Paid from ${goal.name}`;
  if (!isArchived(goal)) return null;
  if (t.entry_type === "contribution") return "Overdraft settlement";
  if (t.entry_type === "withdraw") return "Returned to balance";
  return null;
}
