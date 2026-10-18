/** @file How an entry type is shown wherever transactions are listed: sign, colours, category label and subtitle. */

import { categoryById, type Category } from "./categories";
import { goalById, isArchived, type Goal } from "./goals";
import { isTransfer, type EntryType, type Transaction } from "./transactions";

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
 * The row's name when the description is blank: the goal for a transfer, the
 * category otherwise. API-created rows can arrive blank; the form itself
 * fills in the goal name.
 */
export function entryTitle(
  t: Transaction,
  categories: Category[],
  goals: Goal[],
): string {
  if (t.description) return t.description;
  if (isTransfer(t.entry_type)) {
    return goalById(goals, t.goal)?.name ?? "Savings";
  }
  return entryCategoryLabel(t, categories) ?? "Untitled";
}

/**
 * The line under a row's name. An expense paid from a goal names the goal.
 * The archive's own rows, the contribution that settled an overdraft or the
 * withdrawal that returned what was left, are told apart by the description
 * the server writes: a goal's earlier transfers sit on the same archived
 * goal and must not be mistaken for them. Null otherwise.
 */
export function entrySubtitle(t: Transaction, goals: Goal[]): string | null {
  const goal = goalById(goals, t.goal);
  if (!goal) return null;
  if (t.entry_type === "expense") return `Paid from ${goal.name}`;
  if (!isArchived(goal) || !isArchiveRow(t, goal)) return null;
  if (t.entry_type === "contribution") return "Overdraft settlement";
  if (t.entry_type === "withdraw") return "Returned to balance";
  return null;
}

/** The server's description for an archive row, current and pre-rename forms. */
function isArchiveRow(t: Transaction, goal: Goal): boolean {
  return (
    t.description === `Archived ${goal.name}` ||
    t.description === `Goal ${goal.name} archived`
  );
}
