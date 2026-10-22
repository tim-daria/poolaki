/** @file Who may edit a transaction or a goal, mirrored from the server's rules. */

import { describe, expect, it } from "vitest";
import { canEditGoal, canEditTransaction, goalLock } from "./access";
import type { Goal } from "./goals";
import type { Role } from "./organizations";
import type { Transaction } from "./transactions";

function tx(created_by: string | null): Transaction {
  return {
    id: 1,
    entry_type: "expense",
    category: 3,
    description: "Flights",
    amount: 640,
    transaction_date: "2026-07-03",
    is_tax_deductible: false,
    goal: null,
    created_by,
  };
}

function goal(created_by: string | null): Goal {
  return {
    id: 9,
    name: "Trip",
    target_amount: 2000,
    balance: 500,
    spendable: false,
    progress: 0.25,
    overdue: false,
    completed_at: null,
    created_by,
    target_date: null,
    status: "active",
    created_at: "2026-04-01T09:00:00Z",
  };
}

describe("canEditTransaction", () => {
  it.each<[string, string | null, string | undefined, boolean]>([
    ["the creator", "ana", "ana", true],
    ["another member", "ana", "ben", false],
    ["a signed-out user", "ana", undefined, false],
    // The creator's account is gone: nobody can claim the row.
    ["anyone, when the creator is null", null, "ana", false],
  ])("%s → %s", (_, created_by, username, allowed) => {
    expect(canEditTransaction(tx(created_by), username)).toBe(allowed);
  });
});

describe("goalLock", () => {
  const trip = goal("ana");
  const contribution = (amount: number): Transaction => ({
    ...tx("ana"),
    entry_type: "contribution",
    category: 5,
    goal: trip.id,
    amount,
  });

  it("lets the server decide when the goal is not loaded", () => {
    expect(goalLock(contribution(100), undefined)).toBeNull();
  });

  it("ignores a goal that is not the row's", () => {
    expect(goalLock(contribution(100), { ...trip, id: 2 })).toBeNull();
  });

  it("locks every row of an archived goal, whatever its type", () => {
    const archived: Goal = { ...trip, status: "archived", balance: 0 };
    expect(goalLock(contribution(100), archived)).toEqual({ kind: "archived" });
    expect(
      goalLock({ ...tx("ana"), goal: trip.id, amount: 20 }, archived),
    ).toEqual({ kind: "archived" });
  });

  it("allows deleting a contribution the goal still holds in full", () => {
    expect(goalLock(contribution(500), trip)).toBeNull();
  });

  it("refuses deleting a contribution the goal has spent from, by the shortfall", () => {
    expect(goalLock(contribution(620.1), trip)).toEqual({
      kind: "overdraw",
      shortfall: 120.1,
    });
  });

  it("never locks a withdrawal or an expense on an open goal", () => {
    expect(
      goalLock({ ...contribution(900), entry_type: "withdraw" }, trip),
    ).toBeNull();
    expect(
      goalLock({ ...tx("ana"), goal: trip.id, amount: 900 }, trip),
    ).toBeNull();
  });
});

describe("canEditGoal", () => {
  it.each<[string, string | null, string | undefined, Role, boolean]>([
    ["the creator", "ana", "ana", "member", true],
    ["the owner, not the creator", "ana", "ben", "owner", true],
    ["another member", "ana", "ben", "member", false],
    ["the owner, creator gone", null, "ben", "owner", true],
    ["a member, creator gone", null, "ben", "member", false],
  ])("%s → %s", (_, created_by, username, role, allowed) => {
    expect(canEditGoal(goal(created_by), username, role)).toBe(allowed);
  });
});
