/** @file Draft state transitions, submit validation, 400-body rewriting and the list/update fetchers for transactions. */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  changeType,
  describeProblem,
  emptyDraft,
  toDraft,
  validateDraft,
  fetchTransactionPage,
  updateTransaction,
  TransactionError,
  type Transaction,
  type TransactionDraft,
} from "./transactions";
import { DEFAULT_FILTERS, type TransactionFilters } from "./transactionFilters";

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

function stubFetch(body: unknown, status = 200) {
  const fn = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ORG = 1;

/** One row as TransactionResponseSerializer emits it. */
const DTO = {
  id: 7,
  org_id: 1,
  goal_id: null,
  category_id: 3,
  entry_type: "expense",
  amount: "52.00",
  description: "Ristorante Baldi",
  transaction_date: "2026-03-10",
  is_tax_deductible: false,
  created_by: "pavel",
  created_at: "2026-03-10T12:00:00Z",
} as const;

/** The list endpoint's response for an empty workspace. */
const EMPTY_PAGE = {
  transactions: [],
  total: 0,
  page: 1,
  page_count: 1,
  counts: { all: 0, income: 0, expense: 0, contribution: 0 },
};

describe("fetchTransactionPage", () => {
  it("sends no params for the default filters", async () => {
    const fetch = stubFetch(EMPTY_PAGE);
    await fetchTransactionPage(ORG, DEFAULT_FILTERS);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/v1/organizations/1/transactions/?");
    expect(init.credentials).toBe("include");
  });

  it.each<[Partial<TransactionFilters>, string]>([
    [{ tab: "income" }, "entry_type=income"],
    [{ q: "rewe" }, "q=rewe"],
    [{ sort: "oldest" }, "sort=oldest"],
    [{ from: "2026-01-01" }, "date_from=2026-01-01"],
    [{ categories: [3, 7] }, "category_id=3%2C7"],
    [{ taxDeductible: true }, "tax_deductible=true"],
    [{ page: 2 }, "page=2&page_size=15"],
  ])("encodes %j as %s", async (override, expected) => {
    const fetch = stubFetch(EMPTY_PAGE);
    await fetchTransactionPage(ORG, { ...DEFAULT_FILTERS, ...override });
    expect(fetch.mock.calls[0][0]).toContain(`?${expected}`);
  });

  it("maps the rows and passes the paging fields through", async () => {
    const counts = { all: 1, income: 0, expense: 1, contribution: 0 };
    stubFetch({
      transactions: [{ ...DTO, description: null }],
      total: 1,
      page: 2,
      page_count: 3,
      counts,
    });

    const result = await fetchTransactionPage(ORG, DEFAULT_FILTERS);

    expect(result.rows).toEqual([
      {
        id: 7,
        entry_type: "expense",
        category: 3,
        description: "",
        amount: 52,
        transaction_date: "2026-03-10",
        is_tax_deductible: false,
        goal: null,
        created_by: "pavel",
      },
    ]);
    expect(result).toMatchObject({ total: 1, page: 2, page_count: 3, counts });
  });

  it("rejects with the status on a failed request", async () => {
    stubFetch({}, 500);
    await expect(fetchTransactionPage(ORG, DEFAULT_FILTERS)).rejects.toThrow(
      "Failed to load transactions (500)",
    );
  });
});

describe("updateTransaction", () => {
  const ID = 7;

  it("PATCHes the draft as JSON with the CSRF token", async () => {
    const fetch = stubFetch({ transaction: DTO });
    await updateTransaction(ORG, ID, draft(), "tok");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/v1/organizations/1/transactions/7/");
    expect(init.method).toBe("PATCH");
    expect(init.headers["X-CSRFToken"]).toBe("tok");
    expect(JSON.parse(init.body)).toMatchObject({
      amount: "3.50",
      category_id: 1,
    });
  });

  it("reads the row from the response's transaction key", async () => {
    stubFetch({ transaction: DTO });

    const saved = await updateTransaction(ORG, ID, draft(), "tok");

    expect(saved).toMatchObject({ id: ID, amount: 52, category: 3 });
  });

  it("turns a 400 into a TransactionError", async () => {
    stubFetch({ detail: "Not enough balance." }, 400);
    await expect(
      updateTransaction(ORG, ID, draft(), "tok"),
    ).rejects.toBeInstanceOf(TransactionError);
  });

  it("carries the backend's message on a 400", async () => {
    stubFetch({ detail: "Not enough balance." }, 400);
    await expect(updateTransaction(ORG, ID, draft(), "tok")).rejects.toThrow(
      "Not enough balance.",
    );
  });

  it("rejects with the status on any other failure", async () => {
    stubFetch({}, 500);
    await expect(updateTransaction(ORG, ID, draft(), "tok")).rejects.toThrow(
      "Failed to update transaction (500)",
    );
  });
});

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
