/** @file Goal state, flags, the target-reached cue, bar look, lookup, draft validation and the PATCH diff. */

import { describe, expect, it } from "vitest";
import {
  canTransfer,
  goalBarLook,
  goalById,
  goalFlags,
  goalPatch,
  goalState,
  isOffLimits,
  overBy,
  targetReachedCue,
  toGoalDraft,
  validateGoalDraft,
  type Goal,
  type GoalDraft,
  type GoalStatus,
} from "./goals";

const TODAY = "2026-09-15";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 1,
    name: "Trip",
    target_amount: 2000,
    balance: 1790,
    spendable: false,
    progress: 0.9,
    overdue: false,
    completed_at: null,
    created_by: "owner",
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
    expect(goalState(goal({ balance: 2500 }))).toBe("active");
  });
});

describe("goalFlags", () => {
  it.each<[string, Partial<Goal>, string[]]>([
    ["active past its deadline", { target_date: "2026-09-01" }, ["overdue"]],
    ["active due today", { target_date: TODAY }, []],
    ["active with no deadline", { target_date: null }, []],
    [
      "active at target past its deadline",
      { target_date: "2026-09-01", balance: 2000 },
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
      { target_date: "2026-09-01", status: "archived", balance: 2000 },
      [],
    ],
    ["active below zero", { balance: -340 }, ["off_limits"]],
    [
      "completed below zero",
      { balance: -340, status: "completed" },
      ["off_limits"],
    ],
    // Archiving settles the overdraft, so an archived goal is never off limits.
    ["archived below zero", { balance: -340, status: "archived" }, []],
    [
      "active, below zero, past its deadline: off limits first",
      { balance: -340, target_date: "2026-09-01" },
      ["off_limits", "overdue"],
    ],
  ])("%s", (_, overrides, expected) => {
    expect(goalFlags(goal(overrides), TODAY)).toEqual(expected);
  });
});

describe("isOffLimits and overBy", () => {
  it.each<[Partial<Goal>, boolean, number]>([
    [{ balance: 1790 }, false, 0],
    [{ balance: 0 }, false, 0],
    [{ balance: -340 }, true, 340],
    [{ balance: -340, status: "completed" }, true, 340],
    [{ balance: -340, status: "archived" }, false, 340],
  ])("%o → off limits %s, over by %i", (overrides, offLimits, over) => {
    expect(isOffLimits(goal(overrides))).toBe(offLimits);
    expect(overBy(goal(overrides))).toBe(over);
  });
});

describe("canTransfer", () => {
  it.each<[GoalStatus, boolean]>([
    ["active", true],
    ["completed", false],
    ["archived", false],
  ])("a %s goal: %s", (status, allowed) => {
    expect(canTransfer(goal({ status }))).toBe(allowed);
  });
});

describe("targetReachedCue", () => {
  it("asks to mark a full active goal as completed", () => {
    expect(targetReachedCue(goal({ balance: 2000 }))).toMatch(
      /Mark it as completed/,
    );
  });

  it.each<Partial<Goal>>([
    { balance: 1999.99 },
    { balance: 2000, status: "completed" },
    { balance: 2000, status: "archived" },
  ])("is silent for %o", (overrides) => {
    expect(targetReachedCue(goal(overrides))).toBeNull();
  });
});

describe("goalBarLook", () => {
  it("rounds the percentage and fills the bar up to it", () => {
    expect(goalBarLook(goal())).toMatchObject({ pct: 90, barValue: 90 });
  });

  it("draws only the excess past 100% while reporting the real figure", () => {
    const look = goalBarLook(goal({ balance: 2400, status: "completed" }));
    expect(look).toMatchObject({ pct: 120, barValue: 20 });
    expect(
      goalBarLook(goal({ balance: 2000, status: "completed" })),
    ).toMatchObject({ pct: 100, barValue: 100 });
  });

  it("caps the drawn bar at 100 for an active goal past its target", () => {
    expect(goalBarLook(goal({ balance: 2400 }))).toMatchObject({
      pct: 120,
      barValue: 100,
    });
  });

  it("reads 0% for a zero target", () => {
    expect(goalBarLook(goal({ target_amount: 0 })).pct).toBe(0);
  });

  it("reads 0% below zero instead of a negative figure", () => {
    expect(goalBarLook(goal({ balance: -340 }))).toMatchObject({
      pct: 0,
      barValue: 0,
    });
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
  const GOALS = [goal({ id: 1 }), goal({ id: 2, name: "Emergency fund" })];
  it("finds a goal by id", () => {
    expect(goalById(GOALS, 2)?.name).toBe("Emergency fund");
  });

  it("returns undefined for null and unknown ids", () => {
    expect(goalById(GOALS, null)).toBeUndefined();
    expect(goalById(GOALS, 999)).toBeUndefined();
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
  });

  it("accepts a draft with no date: the deadline is optional", () => {
    expect(validateGoalDraft({ ...valid, target_date: "" })).toBeNull();
  });
});

describe("toGoalDraft", () => {
  it("renders the amount as a money string and a missing date as empty", () => {
    expect(toGoalDraft(goal({ target_amount: 480 }))).toEqual({
      name: "Trip",
      target_amount: "480.00",
      target_date: "",
    });
    expect(toGoalDraft(goal({ target_date: "2026-12-31" })).target_date).toBe(
      "2026-12-31",
    );
  });
});

describe("goalPatch", () => {
  const original = goal({ name: "Trip", target_date: "2026-12-31" });
  const unchanged = toGoalDraft(original);

  it("is empty when nothing changed", () => {
    expect(goalPatch(original, unchanged, "active")).toEqual({});
  });

  it("sends only the fields that differ", () => {
    expect(
      goalPatch(original, { ...unchanged, target_amount: "2500" }, "active"),
    ).toEqual({ target_amount: "2500.00" });
    expect(goalPatch(original, unchanged, "completed")).toEqual({
      status: "completed",
    });
  });

  it("normalises the name the way the form posts it", () => {
    expect(
      goalPatch(original, { ...unchanged, name: "  Trip " }, "active"),
    ).toEqual({});
    expect(
      goalPatch(original, { ...unchanged, name: "New  laptop" }, "active"),
    ).toEqual({ name: "New laptop" });
  });

  it("clears the date with an explicit null", () => {
    expect(
      goalPatch(original, { ...unchanged, target_date: "" }, "active"),
    ).toEqual({
      target_date: null,
    });
  });
});
