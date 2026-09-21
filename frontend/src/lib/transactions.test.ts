/** @file Draft state transitions, submit validation and 400-body rewriting for transactions. */

import { describe, expect, it } from "vitest";
import {
  changeType,
  describeProblem,
  emptyDraft,
  toDraft,
  validateDraft,
  type Transaction,
  type TransactionDraft,
} from "./transactions";

function draft(overrides: Partial<TransactionDraft> = {}): TransactionDraft {
  return {
    ...emptyDraft(),
    category: 1,
    description: "Coffee",
    amount: "3.50",
    transaction_date: "2026-03-10",
    ...overrides,
  };
}

describe("toDraft", () => {
  it("renders the amount as a canonical two-decimal string", () => {
    const row: Transaction = {
      id: 5,
      entry_type: "income",
      category: 8,
      description: "Pay",
      amount: 49.9,
      transaction_date: "2026-02-01",
      is_tax_deductible: false,
      goal: null,
      created_by: null,
    };
    expect(toDraft(row)).toEqual({
      entry_type: "income",
      category: 8,
      goal: null,
      description: "Pay",
      amount: "49.90",
      transaction_date: "2026-02-01",
      is_tax_deductible: false,
    });
  });
});

describe("changeType", () => {
  const base = draft({
    entry_type: "expense",
    category: 3,
    goal: 2,
    is_tax_deductible: true,
  });

  it("always clears the category", () => {
    expect(changeType(base, "income").category).toBeNull();
    expect(changeType(base, "contribution").category).toBeNull();
    expect(changeType(base, "expense").category).toBeNull();
  });

  it("keeps the goal only for contributions", () => {
    expect(changeType(base, "contribution").goal).toBe(2);
    expect(changeType(base, "income").goal).toBeNull();
    expect(changeType(base, "expense").goal).toBeNull();
  });

  it("keeps tax deductible only for expenses", () => {
    expect(changeType(base, "expense").is_tax_deductible).toBe(true);
    expect(changeType(base, "income").is_tax_deductible).toBe(false);
    expect(changeType(base, "contribution").is_tax_deductible).toBe(false);
  });

  it("leaves the other fields untouched", () => {
    const next = changeType(base, "income");
    expect(next.description).toBe(base.description);
    expect(next.amount).toBe(base.amount);
    expect(next.transaction_date).toBe(base.transaction_date);
  });
});

describe("validateDraft", () => {
  it("accepts a complete expense", () => {
    expect(validateDraft(draft())).toBeNull();
  });

  it("requires a non-blank description for income and expense", () => {
    expect(validateDraft(draft({ description: "   " }))).toBe(
      "Description is required.",
    );
  });

  it("requires a category for income and expense", () => {
    expect(validateDraft(draft({ category: null }))).toBe("Pick a category.");
  });

  it("requires a goal for a contribution and ignores description/category", () => {
    const c = draft({
      entry_type: "contribution",
      description: "",
      category: null,
      goal: null,
    });
    expect(validateDraft(c)).toBe("Pick a goal.");
    expect(validateDraft({ ...c, goal: 1 })).toBeNull();
  });

  it("then validates the amount", () => {
    expect(validateDraft(draft({ amount: "" }))).toBe("Enter an amount");
    expect(validateDraft(draft({ amount: "0" }))).toMatch(/at least/);
  });

  it("finally requires a date", () => {
    expect(validateDraft(draft({ transaction_date: "" }))).toBe("Pick a date.");
  });
});

describe("describeProblem", () => {
  it("returns null when the body carries no message", () => {
    expect(describeProblem(null)).toBeNull();
    expect(describeProblem({})).toBeNull();
    expect(describeProblem([])).toBeNull();
    expect(describeProblem({ amount: [] })).toBeNull();
  });

  it("reads the three DRF shapes", () => {
    expect(describeProblem(["Bare message"])).toBe("Bare message");
    expect(describeProblem({ detail: "Not enough balance." })).toBe(
      "Not enough balance.",
    );
    expect(describeProblem({ non_field_errors: ["Nope"] })).toBe("Nope");
  });

  it("prefixes a known field label", () => {
    expect(describeProblem({ description: ["Too long."] })).toBe(
      "Description: Too long.",
    );
  });

  it("skips the prefix when the message already opens with the label", () => {
    expect(describeProblem({ description: ["Description too long."] })).toBe(
      "Description too long.",
    );
  });

  it("passes unknown fields through without a prefix", () => {
    expect(describeProblem({ mystery: ["Nope"] })).toBe("Nope");
  });

  it("rewrites generic DRF messages with the field label", () => {
    expect(
      describeProblem({
        category_id: ['Invalid pk "9" - object does not exist.'],
      }),
    ).toBe(
      "Category is not available on the server. Reload the page and pick again.",
    );
    expect(describeProblem({ amount: ["This field is required."] })).toBe(
      "Amount is missing.",
    );
    expect(describeProblem({ goal_id: ["This field may not be null."] })).toBe(
      "Goal has to be set.",
    );
    expect(describeProblem({ amount: ["A valid number is required."] })).toBe(
      "Amount has to be a number.",
    );
  });

  it("rewrites generic messages with a placeholder for unknown fields", () => {
    expect(describeProblem({ mystery: ["This field is required."] })).toBe(
      "A required field is missing.",
    );
    expect(describeProblem({ mystery: ["Invalid pk"] })).toMatch(
      /^That choice is not available/,
    );
  });

  it("surfaces only the first problem", () => {
    expect(
      describeProblem({ amount: ["First."], description: ["Second."] }),
    ).toBe("Amount: First.");
  });
});
