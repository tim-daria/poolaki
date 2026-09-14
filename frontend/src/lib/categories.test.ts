/** @file Category lookups over an in-memory category list. */

import { describe, expect, it } from "vitest";
import {
  type Category,
  categoryById,
  contributionCategory,
  selectableCategories,
} from "./categories";

const CATEGORIES: Category[] = [
  { id: 1, name: "Groceries", type: "expense" },
  { id: 2, name: "Rent", type: "expense" },
  { id: 3, name: "Salary", type: "income" },
  { id: 4, name: "Savings", type: "contribution" },
];

describe("categoryById", () => {
  it("finds a category by id", () => {
    expect(categoryById(CATEGORIES, 1)?.name).toBe("Groceries");
  });

  it("returns undefined for null and unknown ids", () => {
    expect(categoryById(CATEGORIES, null)).toBeUndefined();
    expect(categoryById(CATEGORIES, 999)).toBeUndefined();
  });

  it("returns undefined while the list is still empty", () => {
    expect(categoryById([], 1)).toBeUndefined();
  });
});

describe("selectableCategories", () => {
  it("returns only categories of the matching type", () => {
    expect(
      selectableCategories(CATEGORIES, "expense").map((c) => c.id),
    ).toEqual([1, 2]);
    expect(selectableCategories(CATEGORIES, "income").map((c) => c.id)).toEqual(
      [3],
    );
  });

  it("offers nothing for a contribution", () => {
    expect(selectableCategories(CATEGORIES, "contribution")).toEqual([]);
  });
});

describe("contributionCategory", () => {
  it("finds the contribution category", () => {
    expect(contributionCategory(CATEGORIES)?.id).toBe(4);
  });

  it("is undefined while the list is still loading", () => {
    expect(contributionCategory([])).toBeUndefined();
  });
});
