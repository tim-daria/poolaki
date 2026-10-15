/** @file Goal state, flags, hint, bar look, lookup and draft validation. */

import { describe, expect, it } from "vitest";
import {
  goalBarLook,
  goalById,
  goalFlags,
  goalHint,
  goalState,
  validateGoalDraft,
  type Goal,
  type GoalDraft,
  type GoalStatus,
} from "./goals";
import { SEED_GOALS } from "./goals.seed";

const TODAY = "2026-09-15";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 1,
    name: "Trip",
    target_amount: 2000,
    saved_amount: 1790,
    balance: 1790,
    spendable: false,
    target_date: null,
    status: "active",
    created_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("goalState", () => {
  it.each<GoalStatus>(["active", "completed", "archived"])(
    "is the wire status: %s",
    (status) => {
      expect(goalState(goal({ status }))).toBe(status);
    },
  );

  it("keeps a goal past its target active until the user completes it", () => {
    expect(goalState(goal({ saved_amount: 2500 }))).toBe("active");
  });
});

describe("goalFlags", () => {
  it.each<[string, Partial<Goal>, string[]]>([
    ["active past its deadline", { target_date: "2026-09-01" }, ["overdue"]],
    ["active due today", { target_date: TODAY }, []],
    ["active with no deadline", { target_date: null }, []],
    [
      "active at target past its deadline",
      { target_date: "2026-09-01", saved_amount: 2000 },
      [],
    ],
    [
      "completed past its deadline short of target",
      { target_date: "2026-09-01", status: "completed" },
      [],
    ],
    [
      "archived short of target past its deadline",
      { target_date: "2026-09-01", status: "archived" },
      ["overdue"],
    ],
    [
      "archived at target past its deadline",
      { target_date: "2026-09-01", status: "archived", saved_amount: 2000 },
      [],
    ],
  ])("%s", (_, overrides, expected) => {
    expect(goalFlags(goal(overrides), TODAY)).toEqual(expected);
  });
});

describe("goalHint", () => {
  it("asks to mark a full active goal as completed", () => {
    expect(goalHint(goal({ saved_amount: 2000 }))).toMatch(
      /Mark it as completed/,
    );
  });

  it.each<Partial<Goal>>([
    { saved_amount: 1999.99 },
    { saved_amount: 2000, status: "completed" },
    { saved_amount: 2000, status: "archived" },
  ])("is silent for %o", (overrides) => {
    expect(goalHint(goal(overrides))).toBeNull();
  });
});

describe("goalBarLook", () => {
  it("rounds the percentage and fills the bar up to it", () => {
    expect(goalBarLook(goal())).toMatchObject({ pct: 90, barValue: 90 });
  });

  it("draws only the excess past 100% while reporting the real figure", () => {
    const look = goalBarLook(goal({ saved_amount: 2400, status: "completed" }));
    expect(look).toMatchObject({ pct: 120, barValue: 20 });
    expect(
      goalBarLook(goal({ saved_amount: 2000, status: "completed" })),
    ).toMatchObject({ pct: 100, barValue: 100 });
  });

  it("caps the drawn bar at 100 for an active goal past its target", () => {
    expect(goalBarLook(goal({ saved_amount: 2400 }))).toMatchObject({
      pct: 120,
      barValue: 100,
    });
  });

  it("reads 0% for a zero target", () => {
    expect(goalBarLook(goal({ target_amount: 0 })).pct).toBe(0);
  });

  it.each<[GoalStatus, string]>([
    ["active", "primary.dark"],
    ["completed", "success.main"],
    ["archived", "text.disabled"],
  ])("colours the %s bar %s", (status, fill) => {
    expect(goalBarLook(goal({ status })).fill).toBe(fill);
  });
});

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
