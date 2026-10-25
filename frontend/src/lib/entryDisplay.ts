/** @file How an entry type is shown wherever transactions are listed: sign, colours, category label and subtitle. */

import { categoryById, type Category } from "./categories";
import { goalById, isArchived, type Goal } from "./goals";
import { displayAmount } from "./money";
import { isTransfer, type EntryType, type Transaction } from "./transactions";

/** Sign, colours and chip look of a row. Values are theme palette paths for `sx`. */
export interface EntryStyle {
  sign: string;
  chipBg: string;
  color: string;
  chipColor?: string;
  chipBorder?: string;
}

/**
 * Expenses stay neutral; income is green with a plus. A transfer is drawn as
 * an arrow into or out of savings, never as spending or earning: a
 * contribution points in, a withdrawal points out in the lighter lavender.
 * Values are theme palette paths for `sx`.
 */
export const ENTRY_STYLE: Record<EntryType, EntryStyle> = {
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
 * The settlement is drawn as an outlined chip and a muted amount: money
 * moved, not spent, and not a top-up either.
 */
export const OVERDRAFT_STYLE: EntryStyle = {
  sign: "→",
  chipBg: "transparent",
  color: "text.secondary",
  chipColor: "accent.main",
  chipBorder: "accent.main",
};

/**
 * The contribution the server writes when a goal is archived below zero.
 * The form files every user contribution under the Contribution category,
 * so no category is the server's own marker for this row (see
 * `_archive_goal`; the report excludes these rows from savings the same way).
 */
export function isOverdraftSettlement(t: Transaction): boolean {
  return t.entry_type === "contribution" && t.category === null;
}

export function entryStyle(t: Transaction): EntryStyle {
  return isOverdraftSettlement(t) ? OVERDRAFT_STYLE : ENTRY_STYLE[t.entry_type];
}

/** What the settlement row's info icon says; `amount` is the overdraft. */
export function overdraftHint(amount: number): string {
  return `This isn't a new expense. You spent €${displayAmount(amount)} more than the goal held, and this moves that amount from your balance when the goal is archived.`;
}

/**
 * Contributions are filed under "Savings", the archive's settlement under
 * "Overdraft"; a withdrawal carries no category at all, on the wire or here.
 * Null for a removed or unknown category.
 */
export function entryCategoryLabel(
  t: Transaction,
  categories: Category[],
): string | null {
  if (isOverdraftSettlement(t)) return "Overdraft";
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
 * The settlement contribution carries no category; the withdrawal that
 * returned what was left is told apart by the description the server
 * writes, since a goal's earlier withdrawals sit on the same archived goal
 * and must not be mistaken for it. Null otherwise.
 */
export function entrySubtitle(t: Transaction, goals: Goal[]): string | null {
  const goal = goalById(goals, t.goal);
  if (!goal) return null;
  if (t.entry_type === "expense") return `Paid from ${goal.name}`;
  if (isOverdraftSettlement(t)) return "Overdraft settlement";
  if (
    t.entry_type === "withdraw" &&
    isArchived(goal) &&
    isArchiveRow(t, goal)
  ) {
    return "Returned to balance";
  }
  return null;
}

/** The server's description for an archive withdrawal, current and pre-rename forms. */
function isArchiveRow(t: Transaction, goal: Goal): boolean {
  return (
    t.description === `Archived ${goal.name}` ||
    t.description === `Goal ${goal.name} archived`
  );
}
