/** @file Entry styling: signs and colours per type, the category label, the subtitle per goal state. */

import { describe, expect, it } from "vitest";
import type { Category } from "./categories";
import { ENTRY_STYLE, entryCategoryLabel, entrySubtitle } from "./entryDisplay";
import type { Goal } from "./goals";
import type { EntryType, Transaction } from "./transactions";

const FOOD: Category = { id: 3, name: "Food", type: "expense" };

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 9,
    name: "Trip",
    target_amount: 2000,
    balance: 500,
    spendable: true,
    progress: 0.25,
    overdue: false,
    completed_at: null,
    created_by: "owner",
    target_date: null,
    status: "active",
    created_at: "2026-04-01T09:00:00Z",
    ...overrides,
  };
}

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    entry_type: "expense",
    category: FOOD.id,
    description: "Flights",
    amount: 640,
    transaction_date: "2026-07-03",
    is_tax_deductible: false,
    goal: null,
    created_by: null,
    ...overrides,
  };
}

describe("ENTRY_STYLE", () => {
  it.each<[EntryType, string, string]>([
    ["expense", "-", "text.primary"],
    ["income", "+", "success.main"],
    ["contribution", "→ ", "accent.main"],
    ["withdraw", "← ", "secondary.light"],
  ])("draws a %s as %j in %s", (type, sign, color) => {
    expect(ENTRY_STYLE[type]).toMatchObject({ sign, color });
  });
});

describe("entryCategoryLabel", () => {
  it("names the category of an income or expense", () => {
    expect(entryCategoryLabel(tx(), [FOOD])).toBe("Food");
    expect(entryCategoryLabel(tx({ category: 99 }), [FOOD])).toBeNull();
  });

  it("files a contribution under Savings and a withdrawal under Withdraw", () => {
    expect(
      entryCategoryLabel(
        tx({ entry_type: "contribution", category: null }),
        [],
      ),
    ).toBe("Savings");
    expect(
      entryCategoryLabel(tx({ entry_type: "withdraw", category: null }), []),
    ).toBe("Withdraw");
  });
});

describe("entrySubtitle", () => {
  it("names the goal an expense was paid from", () => {
    expect(entrySubtitle(tx({ goal: 9 }), [goal()])).toBe("Paid from Trip");
  });

  it.each<[EntryType, string]>([
    ["contribution", "Overdraft settlement"],
    ["withdraw", "Returned on archiving"],
  ])("marks a %s on an archived goal: %s", (type, subtitle) => {
    const archived = goal({ status: "archived" });
    expect(
      entrySubtitle(tx({ entry_type: type, goal: 9, category: null }), [
        archived,
      ]),
    ).toBe(subtitle);
  });

  it("is null for a plain expense, a transfer on an open goal, or an unknown goal", () => {
    expect(entrySubtitle(tx(), [goal()])).toBeNull();
    expect(
      entrySubtitle(
        tx({ entry_type: "contribution", goal: 9, category: null }),
        [goal()],
      ),
    ).toBeNull();
    expect(entrySubtitle(tx({ goal: 404 }), [goal()])).toBeNull();
  });
});
