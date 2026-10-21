/** @file Who may change what, mirrored from the server so the UI never offers an action that will be refused. */

import type { Goal } from "./goals";
import type { Role } from "./organizations";
import type { Transaction } from "./transactions";

/** Creator only: the transaction views filter by `created_by`, so anyone else gets 404. */
export function canEditTransaction(
  t: Transaction,
  username: string | undefined,
): boolean {
  return t.created_by !== null && t.created_by === username;
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
