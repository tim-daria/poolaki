/** @file Goal info view: figures, subtitle, entry mapping, the cumulative split, month grouping and the loader. */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  annotate,
  getGoalActivity,
  goalFigures,
  goalSubtitle,
  groupByMonth,
  toActivity,
  type ActivityEntry,
} from "./goalActivity";
import type { Goal } from "./goals";
import type { Transaction } from "./transactions";

const ORG = 1;
const BARCELONA = 9;
const TARGET = 2000;
const TODAY = "2026-09-15";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: BARCELONA,
    name: "Trip to Barcelona",
    target_amount: TARGET,
    balance: -340,
    spendable: true,
    progress: -0.17,
    overdue: false,
    completed_at: "2026-06-12",
    created_by: "owner",
    target_date: "2026-07-31",
    status: "completed",
    created_at: "2026-04-01T09:00:00Z",
    ...overrides,
  };
}

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    entry_type: "expense",
    category: 3,
    description: "Flights",
    amount: 640,
    transaction_date: "2026-07-03",
    is_tax_deductible: false,
    goal: BARCELONA,
    created_by: null,
    ...overrides,
  };
}

function entry(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    id: 1,
    kind: "added",
    date: "2026-05-10",
    description: "",
    amount: 100,
    ...overrides,
  };
}

/**
 * Three contributions that reach the target on 12 Jun, then four expenses that
 * run the goal out on the third (€160 from the goal, €220 from the balance).
 */
const BARCELONA_ENTRIES: ActivityEntry[] = [
  entry({ id: 911, date: "2026-05-10", amount: 800 }),
  entry({ id: 912, date: "2026-05-25", amount: 700 }),
  entry({ id: 913, date: "2026-06-12", amount: 500 }),
  entry({
    id: 914,
    kind: "spent",
    date: "2026-07-03",
    description: "Flights",
    amount: 640,
  }),
  entry({
    id: 915,
    kind: "spent",
    date: "2026-07-10",
    description: "Hotel",
    amount: 1200,
  }),
  entry({
    id: 916,
    kind: "spent",
    date: "2026-07-15",
    description: "Sagrada Família tickets",
    amount: 380,
  }),
  entry({
    id: 917,
    kind: "spent",
    date: "2026-07-16",
    description: "Tapas dinner",
    amount: 120,
  }),
];

const BARCELONA_ROWS = annotate(BARCELONA_ENTRIES, TARGET);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("goalFigures", () => {
  it("sums saved and spent from the rows; progress from the wire balance", () => {
    expect(goalFigures(goal({ balance: -340 }), BARCELONA_ROWS)).toEqual({
      saved: 2000,
      // Only what the goal covered: the balance paid the rest.
      spent: 2000,
      pct: -17,
      toGo: 2340,
      leftShare: 0,
    });
  });

  it("keeps the share left for a goal with money in it", () => {
    const rows = annotate(
      [
        entry({ amount: 2000 }),
        entry({ id: 2, kind: "withdrawn", amount: 210 }),
      ],
      TARGET,
    );
    expect(
      goalFigures(goal({ balance: 1790, status: "active" }), rows),
    ).toEqual({ saved: 1790, spent: 0, pct: 90, toGo: 210, leftShare: 100 });
    expect(goalFigures(goal({ balance: 500 }), rows).leftShare).toBe(28);
  });

  it("is all zeros with no rows", () => {
    expect(goalFigures(goal({ balance: 0 }), [])).toEqual({
      saved: 0,
      spent: 0,
      pct: 0,
      toGo: TARGET,
      leftShare: 0,
    });
  });
});

describe("goalSubtitle", () => {
  it.each<[string, Partial<Goal>, { text: string; alert: string | null }]>([
    ["archived", { status: "archived" }, { text: "Archived", alert: null }],
    [
      "overdrawn",
      { status: "completed", balance: -340 },
      { text: "Overdrawn · paid from your balance", alert: null },
    ],
    [
      "used up",
      { status: "completed", balance: 0 },
      { text: "Used up", alert: null },
    ],
    [
      "ready",
      { status: "completed", balance: 500 },
      { text: "Ready to spend", alert: null },
    ],
    [
      "saving, overdue",
      { status: "active", balance: 1790, target_date: "2025-12-31" },
      { text: "Saving", alert: "overdue since Dec 2025" },
    ],
    [
      "saving with a deadline",
      { status: "active", balance: 1790, target_date: "2026-12-31" },
      { text: "Saving · by Dec 2026", alert: null },
    ],
    [
      "saving with no deadline",
      { status: "active", balance: 1790, target_date: null },
      { text: "Saving", alert: null },
    ],
    [
      "saving past the target",
      { status: "active", balance: 2500, target_date: "2025-12-31" },
      { text: "Saving · target reached", alert: null },
    ],
  ])("%s", (_, overrides, expected) => {
    expect(goalSubtitle(goal(overrides), TODAY)).toEqual(expected);
  });
});

describe("toActivity", () => {
  it("files a contribution as added, a withdrawal as withdrawn, an expense as spent", () => {
    expect(toActivity(tx({ entry_type: "contribution" }))?.kind).toBe("added");
    expect(toActivity(tx({ entry_type: "withdraw" }))?.kind).toBe("withdrawn");
    expect(toActivity(tx())).toEqual({
      id: 1,
      kind: "spent",
      date: "2026-07-03",
      description: "Flights",
      amount: 640,
    });
  });

  it("drops income", () => {
    expect(toActivity(tx({ entry_type: "income" }))).toBeNull();
  });
});

describe("annotate", () => {
  it("splits each expense against what the goal held at the time", () => {
    const spent = BARCELONA_ROWS.filter((r) => r.kind === "spent");
    expect(spent.map((r) => [r.fromGoal, r.fromBalance])).toEqual([
      [640, 0],
      [1200, 0],
      [160, 220],
      [0, 120],
    ]);
  });

  it("marks only the contribution that reaches the target", () => {
    expect(
      BARCELONA_ROWS.filter((r) => r.reachedTarget).map((r) => r.date),
    ).toEqual(["2026-06-12"]);
  });

  it("lets a withdrawal reduce what a later expense can take", () => {
    const rows = annotate(
      [
        entry({ id: 1, amount: 300 }),
        entry({ id: 2, kind: "withdrawn", date: "2026-05-11", amount: 200 }),
        entry({ id: 3, kind: "spent", date: "2026-05-12", amount: 150 }),
      ],
      TARGET,
    );
    expect(rows[2]).toMatchObject({ fromGoal: 100, fromBalance: 50 });
  });

  it("orders by date regardless of input order", () => {
    const rows = annotate(
      [
        entry({ id: 2, kind: "spent", date: "2026-05-12", amount: 50 }),
        entry({ id: 1, amount: 100 }),
      ],
      TARGET,
    );
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
    expect(rows[1]).toMatchObject({ fromGoal: 50, fromBalance: 0 });
  });

  it("returns nothing for no entries", () => {
    expect(annotate([], TARGET)).toEqual([]);
  });
});

describe("groupByMonth", () => {
  const groups = groupByMonth(BARCELONA_ROWS);

  it("lists months newest first", () => {
    expect(groups.map((g) => g.key)).toEqual(["2026-07", "2026-06", "2026-05"]);
  });

  it("lists rows newest first within a month", () => {
    expect(groups[0].rows.map((r) => r.description)).toEqual([
      "Tapas dinner",
      "Sagrada Família tickets",
      "Hotel",
      "Flights",
    ]);
  });

  it("is empty for no rows", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("getGoalActivity", () => {
  /** One response per call, in order. Returns the mock so calls can be counted. */
  function stubFetch(bodies: unknown[], status = 200) {
    const fn = vi.fn();
    for (const body of bodies) {
      fn.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
    }
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  const DTO = {
    id: 7,
    org_id: ORG,
    goal_id: BARCELONA,
    category_id: null,
    entry_type: "contribution",
    amount: "500.00",
    description: null,
    transaction_date: "2026-06-12",
    is_tax_deductible: false,
    created_by: "pavel",
    created_at: "2026-06-12T12:00:00Z",
  };

  /** The list endpoint's shape around one page of rows. */
  function page(transactions: unknown[], page_count = 1, page = 1) {
    return {
      transactions,
      total: transactions.length,
      page,
      page_count,
      counts: { all: 0, income: 0, expense: 0, contribution: 0 },
    };
  }

  it("maps the goal's rows and drops income", async () => {
    stubFetch([page([DTO, { ...DTO, id: 8, entry_type: "income" }])]);
    const rows = await getGoalActivity(ORG, BARCELONA);
    expect(rows).toEqual([
      {
        id: 7,
        kind: "added",
        date: "2026-06-12",
        description: "",
        amount: 500,
      },
    ]);
  });

  it("walks every page and concatenates the rows", async () => {
    const fetch = stubFetch([
      page([DTO], 2, 1),
      page([{ ...DTO, id: 8 }], 2, 2),
    ]);
    const rows = await getGoalActivity(ORG, BARCELONA);
    expect(rows.map((r) => r.id)).toEqual([7, 8]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toContain("goal_id=9");
    expect(fetch.mock.calls[1][0]).toContain("page=2");
  });

  it("surfaces a rejected goal id as a TransactionError", async () => {
    stubFetch(
      [{ goal_id: ["Goal does not belong to this organization."] }],
      400,
    );
    await expect(getGoalActivity(ORG, BARCELONA)).rejects.toThrow(
      "Goal does not belong to this organization.",
    );
  });

  it("propagates any other failure", async () => {
    stubFetch([{}], 500);
    await expect(getGoalActivity(ORG, BARCELONA)).rejects.toThrow(
      "Failed to load transactions (500)",
    );
  });
});
