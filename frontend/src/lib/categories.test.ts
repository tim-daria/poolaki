/** @file Seeded category lookups. */

import { describe, expect, it } from "vitest";
import {
  categoryById,
  SEED_CATEGORIES,
  selectableCategories,
} from "./categories";

describe("categoryById", () => {
  it("finds a seeded category", () => {
    expect(categoryById(1)?.label).toBe("Groceries");
  });

  it("returns undefined for null and unknown ids", () => {
    expect(categoryById(null)).toBeUndefined();
    expect(categoryById(999)).toBeUndefined();
  });
});

describe("selectableCategories", () => {
  it("returns only categories of the matching kind", () => {
    const expense = selectableCategories("expense");
    expect(expense.length).toBeGreaterThan(0);
    expect(expense.every((c) => c.kind === "expense")).toBe(true);

    const income = selectableCategories("income");
    expect(income.every((c) => c.kind === "income")).toBe(true);
    expect(expense.length + income.length).toBe(SEED_CATEGORIES.length);
  });

  it("offers nothing for a contribution", () => {
    expect(selectableCategories("contribution")).toEqual([]);
  });
});
