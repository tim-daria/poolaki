/** @file Category types, lookups, and API calls. */

import type { EntryType } from "./transactions";

export type CategoryKind = "expense" | "income" | "contribution";

/** Mirrors CategoryResponseSerializer. */
export type Category = {
  id: number;
  name: string;
  type: CategoryKind;
};

/** Undefined for null IDs and IDs not in the list (e.g. still loading). */
export function categoryById(
  categories: Category[],
  id: number | null,
): Category | undefined {
  return id === null ? undefined : categories.find((c) => c.id === id);
}

/**
 * Categories a user may pick for a given entry type. A contribution carries no
 * category on the wire; the table labels it "Savings" itself.
 */
export function selectableCategories(
  categories: Category[],
  entryType: EntryType,
): Category[] {
  if (entryType === "contribution") return [];
  return categories.filter((c) => c.type === entryType);
}

/** GET /api/v1/organizations/${org_id}/categories/ */
export async function fetchCategories(
  org_id: number,
  signal?: AbortSignal,
): Promise<Category[]> {
  const res = await fetch(`/api/v1/organizations/${org_id}/categories/`, {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
  const data: { categories: Category[] } = await res.json();
  return data.categories;
}

/**
 * The category every contribution is filed under. Created per organization by
 * the backend, so it is looked up rather than hard-coded; undefined only while
 * the list is still loading.
 */
export function contributionCategory(
  categories: Category[],
): Category | undefined {
  return categories.find((c) => c.type === "contribution");
}
