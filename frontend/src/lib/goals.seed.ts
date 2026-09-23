/** @file Seed goals until the goals API lands. TEMPORARY: delete with getGoals()'s seed body. */

import type { Goal } from "./goals";

/**
 * Only ids 1 and 2 exist as database rows (backend seed_transaction_fixtures.py); a
 * contribution is rejected with 400 unless its goal row exists. The transaction picker
 * offers every non-archived goal, so picking "House downpayment" (id 6, display-only)
 * 400s on submit until the Django seeder gains id 6. Completion and flags are derived
 * from the amounts and dates, not seeded: New laptop is past its deadline (overdue),
 * Emergency fund is at 100% (completed), and Student loan / Snowboarding equipment
 * are archived short of their targets (overdue, shown grey).
 */
export const SEED_GOALS: Goal[] = [
  {
    id: 1,
    name: "New laptop",
    target_amount: 2000,
    saved_amount: 1790,
    target_date: "2025-12-31",
    status: "active",
  },
  {
    id: 2,
    name: "Emergency fund",
    target_amount: 3000,
    saved_amount: 3000,
    target_date: null,
    status: "completed",
  },
  {
    id: 3,
    name: "Student loan",
    target_amount: 12000,
    saved_amount: 11000,
    target_date: "2024-01-01",
    status: "archived",
  },
  {
    id: 4,
    name: "Vacation fund",
    target_amount: 1500,
    saved_amount: 1500,
    target_date: null,
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
  {
    id: 6,
    name: "House downpayment",
    target_amount: 300000,
    saved_amount: 150150,
    target_date: "2026-12-15",
    status: "active",
  },
  {
    id: 7,
    name: "Snowboarding equipment",
    target_amount: 1500,
    saved_amount: 100,
    target_date: "2026-08-01",
    status: "archived",
  },
];
