/** @file Goal lookup and draft validation. */

import { describe, expect, it } from "vitest";
import {
  goalById,
  SEED_GOALS,
  validateGoalDraft,
  type GoalDraft,
} from "./goals";

describe("goalById", () => {
  it("finds a goal by id", () => {
    expect(goalById(SEED_GOALS, 2)?.name).toBe("Emergency fund");
  });

  it("returns undefined for null and unknown ids", () => {
    expect(goalById(SEED_GOALS, null)).toBeUndefined();
    expect(goalById(SEED_GOALS, 999)).toBeUndefined();
  });
});

describe("validateGoalDraft", () => {
  const valid: GoalDraft = {
    name: "Bike",
    target_amount: "480.00",
    target_date: "2026-12-31",
  };

  it("accepts a complete draft", () => {
    expect(validateGoalDraft(valid)).toBeNull();
  });

  it("checks name, then amount, then date", () => {
    expect(validateGoalDraft({ ...valid, name: "  " })).toBe(
      "Name is required.",
    );
    expect(validateGoalDraft({ ...valid, name: "", target_amount: "" })).toBe(
      "Name is required.",
    );
    expect(validateGoalDraft({ ...valid, target_amount: "" })).toBe(
      "Enter an amount",
    );
    expect(validateGoalDraft({ ...valid, target_amount: "0" })).toMatch(
      /at least/,
    );
    expect(validateGoalDraft({ ...valid, target_date: "" })).toBe(
      "Pick a target date.",
    );
  });
});
