/** @file Goals as the transaction form needs them; seeded until a goals API exists. */

/**
 * TODO: no goals API exists (core.models.Goal has no route), so SEED_GOALS
 * stands in like SEED_CATEGORIES does. A contribution is rejected with 400
 * unless a Goal row with that id exists for the workspace
 * (TransactionCreateSerializer.validate_goal_id). Replace with a fetch once
 * the endpoints land; goalById keeps its signature.
 */

/** Mirrors core.models.Goal, plus the progress the picker shows. */
export type Goal = {
  id: number;
  name: string;
  target_amount: number;
  /** Derived on the server from the goal's contributions, never sent up. */
  saved_amount: number;
  /** "YYYY-MM-DD", or null for a goal with no deadline. */
  target_date: string | null;
};

export const SEED_GOALS: Goal[] = [
  {
    id: 1,
    name: "New laptop",
    target_amount: 2000,
    saved_amount: 1790,
    target_date: "2026-12-31",
  },
  {
    id: 2,
    name: "Emergency fund",
    target_amount: 3000,
    saved_amount: 620,
    target_date: null,
  },
];

export function goalById(goals: Goal[], id: number | null): Goal | undefined {
  return id === null ? undefined : goals.find((g) => g.id === id);
}
