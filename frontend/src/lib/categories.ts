/** @file Fixed category list and lookups. Seeded client-side until the backend exposes GET categories. */

import type { EntryType } from "./transactions";

export type CategoryKind = "expense" | "income";

export type Category = {
  /** Must match core.Category.id in the backend. */
  id: number;
  label: string;
  kind: CategoryKind;
};

/** IDs are placeholders until a data migration fixes them. */
export const SEED_CATEGORIES: Category[] = [
  { id: 1, label: "Groceries", kind: "expense" },
  { id: 2, label: "Eating out", kind: "expense" },
  { id: 3, label: "Shopping", kind: "expense" },
  { id: 4, label: "Transport", kind: "expense" },
  { id: 5, label: "Housing", kind: "expense" },
  { id: 6, label: "Health", kind: "expense" },
  { id: 7, label: "Other", kind: "expense" },
  { id: 8, label: "Salary", kind: "income" },
  { id: 9, label: "Gift", kind: "income" },
  { id: 10, label: "Other income", kind: "income" },
];

const BY_ID = new Map(SEED_CATEGORIES.map((c) => [c.id, c]));

/** Undefined for null IDs and IDs the seed does not know. */
export function categoryById(id: number | null): Category | undefined {
  return id === null ? undefined : BY_ID.get(id);
}

/**
 * Categories a user may pick for a given entry type. A contribution carries no
 * category on the wire; the table labels it "Savings" itself.
 */
export function selectableCategories(entryType: EntryType): Category[] {
  if (entryType === "contribution") return [];
  return SEED_CATEGORIES.filter((c) => c.kind === entryType);
}
