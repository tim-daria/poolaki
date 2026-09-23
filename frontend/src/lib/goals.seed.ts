/** @file Seed goals until the goals API lands. TEMPORARY: delete with getGoals()'s seed body. */

import type { Goal } from "./goals";

/**
 * Only ids 1 and 2 exist as database rows (backend seed_transaction_fixtures.py), and a
 * contribution is rejected with 400 unless its goal row exists. The transaction picker
 * hides archived goals, so any NON-archived goal added here must also be added to the
 * Django seeder. No seed is `completed` for the same reason: it would be offered by the
 * picker and 400 on submit.
 */
export const SEED_GOALS: Goal[] = [
  {
    id: 1,
    name: "New laptop",
    target_amount: 2000,
    saved_amount: 1790,
    target_date: "2026-12-31",
    status: "active",
  },
  {
    id: 2,
    name: "Emergency fund",
    target_amount: 3000,
    saved_amount: 620,
    target_date: null,
    status: "active",
  },
  {
    id: 3,
    name: "Student loan",
    target_amount: 12000,
    saved_amount: 12000,
    target_date: "2024-01-01",
    status: "archived",
  },
  {
    id: 4,
    name: "Vacation fund",
    target_amount: 1500,
    saved_amount: 1500,
    target_date: "2024-06-01",
    status: "archived",
  },
  {
    id: 5,
    name: "Wedding rings",
    target_amount: 900,
    saved_amount: 900,
    target_date: "2023-08-15",
    status: "archived",
  },
];
