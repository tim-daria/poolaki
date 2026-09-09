/** @file TEMP: seeded transactions so the page renders without a backend. Delete once the API is wired in. */

import type { EntryType, Transaction } from "../../lib/transactions";

/** TEMP: renders the page without a backend. Flip to false to fetch. */
export const USE_MOCK_TRANSACTIONS = true;

/**
 * Rows as [date, type, category, name, amount, taxDeductible?]; category IDs
 * follow SEED_CATEGORIES and contributions carry none. More than one page, so
 * pagination can be exercised.
 */
const MOCK_ROWS: [
  string,
  EntryType,
  number | null,
  string,
  number,
  boolean?,
][] = [
  ["2026-08-05", "expense", 1, "REWE", 255],
  ["2026-08-03", "expense", 2, "Ristorante Baldi", 52],
  ["2026-08-01", "income", 8, "Salary", 3240],
  ["2026-08-01", "contribution", null, "To savings", 300],
  ["2026-07-29", "expense", 1, "Edeka", 61.2],
  ["2026-07-24", "expense", 2, "Pizzeria Nona", 27.9],
  ["2026-07-19", "expense", 3, "Clothes", 78],
  ["2026-07-18", "expense", 1, "REWE", 48.3],
  ["2026-07-17", "contribution", null, "To savings", 300],
  ["2026-07-12", "expense", 4, "BVG monthly ticket", 49, true],
  ["2026-07-08", "expense", 6, "Pharmacy", 18.75, true],
  ["2026-07-05", "expense", 2, "Café Central", 9.4],
  ["2026-07-01", "income", 8, "Salary", 3240],
  ["2026-07-01", "expense", 5, "Rent", 1150],
  ["2026-06-27", "expense", 1, "Lidl", 33.15],
  ["2026-06-22", "income", 9, "Birthday gift", 100],
  ["2026-06-20", "expense", 3, "Bookshop", 24.99, true],
  ["2026-06-17", "contribution", null, "To savings", 300],
  ["2026-06-14", "expense", 2, "Sushi Yama", 41.5],
  ["2026-06-10", "expense", 4, "Taxi", 22],
  ["2026-06-06", "expense", 7, "Haircut", 35],
  ["2026-06-03", "expense", 1, "REWE", 57.8],
  ["2026-06-01", "income", 8, "Salary", 3240],
  ["2026-06-01", "expense", 5, "Rent", 1150],
];

export const MOCK_TRANSACTIONS: Transaction[] = MOCK_ROWS.map(
  ([transaction_date, entry_type, category, description, amount, tax], i) => ({
    id: i + 1,
    entry_type,
    category,
    description,
    amount,
    transaction_date,
    is_tax_deductible: tax ?? false,
    goal: entry_type === "contribution" ? 1 : null,
  }),
);
