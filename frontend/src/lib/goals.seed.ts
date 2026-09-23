/** @file Seed goals until the goals API lands. TEMPORARY: delete with getGoals()'s seed body. */

import type { Goal } from "./goals";

/**
 * Only ids 1 and 2 exist as database rows (backend seed_transaction_fixtures.py); a
 * contribution is rejected with 400 unless its goal row exists. The transaction picker
 * offers every non-archived goal, so picking "House downpayment" (id 6, display-only)
 * 400s on submit until the Django seeder gains id 6. Completion and flags are derived
 * from the amounts and dates, not seeded: New laptop is past its deadline (overdue),
 * Emergency fund is exactly at target and Cat mansion past it (both completed), and
 * Student loan / Snowboarding equipment are archived short of their targets (overdue,
 * shown grey). created_at deliberately does not follow id order, so the page's sort
 * (not completed first, oldest first) is visible rather than coincidental.
 */
export const SEED_GOALS: Goal[] = [
  {
    id: 1,
    name: "New laptop",
    target_amount: 2000,
    saved_amount: 1790,
    target_date: "2025-12-31",
    status: "active",
    created_at: "2025-01-10T09:00:00Z",
  },
  {
    id: 2,
    name: "Emergency fund",
    target_amount: 3000,
    saved_amount: 3000,
    target_date: null,
    status: "completed",
    created_at: "2025-02-14T09:00:00Z",
  },
  {
    id: 3,
    name: "Student loan",
    target_amount: 12000,
    saved_amount: 11000,
    target_date: "2024-01-01",
    status: "archived",
    created_at: "2023-01-10T09:00:00Z",
  },
  {
    id: 4,
    name: "Vacation fund",
    target_amount: 1500,
    saved_amount: 1500,
    target_date: null,
    status: "archived",
    created_at: "2023-11-20T09:00:00Z",
  },
  {
    id: 5,
    name: "Wedding rings",
    target_amount: 900,
    saved_amount: 900,
    target_date: "2023-08-15",
    status: "archived",
    created_at: "2022-09-05T09:00:00Z",
  },
  {
    id: 6,
    name: "House downpayment",
    target_amount: 300000,
    saved_amount: 150150,
    target_date: "2026-12-15",
    status: "active",
    created_at: "2024-11-05T09:00:00Z",
  },
  {
    id: 7,
    name: "Snowboarding equipment",
    target_amount: 1500,
    saved_amount: 100,
    target_date: "2026-08-01",
    status: "archived",
    created_at: "2025-08-01T09:00:00Z",
  },
  {
    id: 8,
    name: "Cat mansion",
    target_amount: 1500000,
    saved_amount: 1515000,
    target_date: "2026-12-15",
    status: "completed",
    created_at: "2024-03-01T09:00:00Z",
  },
];

/**
 * Dev-only preview of the no-goals page: append `?empty` to the URL. Lives with
 * the seed because it goes away with it; a production build never reads it.
 */
export function seedIsEmptied(): boolean {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has("empty")
  );
}
