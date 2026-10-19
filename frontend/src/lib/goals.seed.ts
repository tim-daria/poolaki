/** @file Seed goals until the goals API lands. TEMPORARY: delete with getGoals()'s seed body. */

import type { ActivityEntry } from "./goalActivity";
import type { Goal } from "./goals";

/**
 * Only ids 1 and 2 exist as database rows (backend seed_transaction_fixtures.py); a
 * contribution is rejected with 400 unless its goal row exists. The transaction picker
 * offers every non-archived goal, so picking "House downpayment" (id 6, display-only)
 * 400s on submit until the Django seeder gains id 6. `status` is authoritative, as
 * on the wire; the flags are derived from the amounts and dates: New laptop is past
 * its deadline (overdue), Emergency fund is exactly at target and Cat mansion past it,
 * and Student loan / Snowboarding equipment are archived short of their targets
 * (overdue, shown grey). created_at deliberately does not follow id order, so the
 * page's sort (not completed first, oldest first) is visible rather than coincidental.
 * `balance` is what is left to spend and `spendable` follows the server's rule
 * (completed, or active with no deadline): Emergency fund is spendable but
 * empty, Cat mansion is spendable with money in it, Trip to Barcelona is overspent
 * (balance below zero), the rest cannot pay an expense.
 */
export const SEED_GOALS: Goal[] = [
  {
    id: 1,
    name: "New laptop",
    target_amount: 2000,
    saved_amount: 1790,
    target_date: "2025-12-31",
    balance: 1790,
    spendable: false,
    status: "active",
    created_at: "2025-01-10T09:00:00Z",
  },
  {
    id: 2,
    name: "Emergency fund",
    target_amount: 3000,
    saved_amount: 3000,
    target_date: null,
    balance: 0,
    spendable: true,
    status: "completed",
    created_at: "2025-02-14T09:00:00Z",
  },
  {
    id: 3,
    name: "Student loan",
    target_amount: 12000,
    saved_amount: 11000,
    target_date: "2024-01-01",
    balance: 11000,
    spendable: false,
    status: "archived",
    created_at: "2023-01-10T09:00:00Z",
  },
  {
    id: 4,
    name: "Vacation fund",
    target_amount: 1500,
    saved_amount: 1500,
    target_date: null,
    balance: 0,
    spendable: false,
    status: "archived",
    created_at: "2023-11-20T09:00:00Z",
  },
  {
    id: 5,
    name: "Wedding rings",
    target_amount: 900,
    saved_amount: 900,
    target_date: "2023-08-15",
    balance: 0,
    spendable: false,
    status: "archived",
    created_at: "2022-09-05T09:00:00Z",
  },
  {
    id: 6,
    name: "House downpayment",
    target_amount: 300000,
    saved_amount: 150150,
    target_date: "2026-12-15",
    balance: 150150,
    spendable: false,
    status: "active",
    created_at: "2024-11-05T09:00:00Z",
  },
  {
    id: 7,
    name: "Snowboarding equipment",
    target_amount: 1500,
    saved_amount: 100,
    target_date: "2026-08-01",
    balance: 100,
    spendable: false,
    status: "archived",
    created_at: "2025-08-01T09:00:00Z",
  },
  {
    id: 8,
    name: "Cat mansion",
    target_amount: 1500000,
    saved_amount: 1515000,
    target_date: "2026-12-15",
    balance: 15000,
    spendable: true,
    status: "completed",
    created_at: "2024-03-01T09:00:00Z",
  },
  {
    id: 9,
    name: "Trip to Barcelona",
    target_amount: 2000,
    saved_amount: 2000,
    target_date: "2026-07-31",
    balance: -340,
    spendable: true,
    status: "completed",
    created_at: "2026-04-01T09:00:00Z",
  },
];

/**
 * Activity per goal, used when the goal is not a database row (see
 * getGoalActivity).
 * Trip to Barcelona reaches its target on 12 Jun and runs out on the third
 * expense (€160 from the goal, €220 from the balance); New laptop nets 1.790
 * after one withdrawal, all before the e2e frozen clock (15 Sep 2026).
 */
export const SEED_ACTIVITY: Record<number, ActivityEntry[]> = {
  1: [
    {
      id: 901,
      kind: "added",
      date: "2026-08-01",
      description: "",
      amount: 800,
    },
    {
      id: 902,
      kind: "added",
      date: "2026-08-20",
      description: "",
      amount: 500,
    },
    {
      id: 903,
      kind: "withdrawn",
      date: "2026-09-05",
      description: "",
      amount: 110,
    },
    {
      id: 904,
      kind: "added",
      date: "2026-09-10",
      description: "",
      amount: 600,
    },
  ],
  9: [
    {
      id: 911,
      kind: "added",
      date: "2026-05-10",
      description: "",
      amount: 800,
    },
    {
      id: 912,
      kind: "added",
      date: "2026-05-25",
      description: "",
      amount: 700,
    },
    {
      id: 913,
      kind: "added",
      date: "2026-06-12",
      description: "",
      amount: 500,
    },
    {
      id: 914,
      kind: "spent",
      date: "2026-07-03",
      description: "Flights",
      amount: 640,
    },
    {
      id: 915,
      kind: "spent",
      date: "2026-07-10",
      description: "Hotel",
      amount: 1200,
    },
    {
      id: 916,
      kind: "spent",
      date: "2026-07-15",
      description: "Sagrada Família tickets",
      amount: 380,
    },
    {
      id: 917,
      kind: "spent",
      date: "2026-07-16",
      description: "Tapas dinner",
      amount: 120,
    },
  ],
};

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
