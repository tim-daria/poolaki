/** @file Who may change what, mirrored from the server so the UI never offers an action that will be refused. */

import { isArchived, type Goal } from "./goals";
import { cents } from "./money";
import type { Role } from "./organizations";
import type { Transaction } from "./transactions";

/** Creator only: the transaction views filter by `created_by`, so anyone else gets 404. */
export function canEditTransaction(
  t: Transaction,
  username: string | undefined,
): boolean {
  return t.created_by !== null && t.created_by === username;
}

/**
 * Why a goal's row cannot be deleted, as `lock_goal_and_validate_balance`
 * and the archived check in `views/transaction.py` have it. An archived goal
 * is settled at zero, so its rows cannot go and their amounts cannot change
 * either. Deleting a contribution the goal has already spent from would take
 * the goal below zero; `shortfall` is how far.
 */
export type GoalLock =
  { kind: "archived" } | { kind: "overdraw"; shortfall: number };

/** Null when the row may be deleted, or when its goal is not loaded: the server decides then. */
export function goalLock(
  t: Transaction,
  goal: Goal | undefined,
): GoalLock | null {
  if (!goal || t.goal !== goal.id) return null;
  if (isArchived(goal)) return { kind: "archived" };
  if (t.entry_type === "contribution") {
    const shortfall = cents(t.amount - goal.balance);
    if (shortfall > 0) return { kind: "overdraw", shortfall };
  }
  return null;
}

/** Creator or workspace owner, as `IsGoalCreatorOrOrgOwner` has it. */
export function canEditGoal(
  g: Goal,
  username: string | undefined,
  role: Role,
): boolean {
  return (
    role === "owner" || (g.created_by !== null && g.created_by === username)
  );
}
