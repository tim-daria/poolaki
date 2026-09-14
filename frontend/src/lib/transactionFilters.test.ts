/** @file Filtering, sorting, counting and paging over an in-memory transaction list. */

import { describe, expect, it } from "vitest";
import {
  applyFilters,
  countByTab,
  DEFAULT_FILTERS,
  matchesFilters,
  PAGE_SIZE,
  sortTransactions,
  type TransactionFilters,
} from "./transactionFilters";
import type { Transaction } from "./transactions";

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    entry_type: "expense",
    category: 1, // Groceries in SEED_CATEGORIES
    description: "Weekly shop",
    amount: 10,
    transaction_date: "2026-03-10",
    is_tax_deductible: false,
    goal: null,
    ...overrides,
  };
}

function filters(overrides: Partial<TransactionFilters> = {}) {
  return { ...DEFAULT_FILTERS, ...overrides };
}

describe("matchesFilters", () => {
  it("matches everything with the default filters", () => {
    expect(matchesFilters(tx(), filters())).toBe(true);
  });

  it("applies the date range inclusively", () => {
    const f = filters({ from: "2026-03-10", to: "2026-03-10" });
    expect(matchesFilters(tx({ transaction_date: "2026-03-10" }), f)).toBe(
      true,
    );
    expect(matchesFilters(tx({ transaction_date: "2026-03-09" }), f)).toBe(
      false,
    );
    expect(matchesFilters(tx({ transaction_date: "2026-03-11" }), f)).toBe(
      false,
    );
  });

  it("treats an empty bound as unbounded", () => {
    expect(
      matchesFilters(
        tx({ transaction_date: "1999-01-01" }),
        filters({ to: "2026-01-01" }),
      ),
    ).toBe(true);
  });

  it("keeps only rows in the selected categories", () => {
    const f = filters({ categories: [1, 2] });
    expect(matchesFilters(tx({ category: 2 }), f)).toBe(true);
    expect(matchesFilters(tx({ category: 3 }), f)).toBe(false);
  });

  it("excludes uncategorised rows when a category filter is active", () => {
    expect(
      matchesFilters(tx({ category: null }), filters({ categories: [1] })),
    ).toBe(false);
    expect(matchesFilters(tx({ category: null }), filters())).toBe(true);
  });

  it("taxDeductible true filters, false does not", () => {
    expect(
      matchesFilters(
        tx({ is_tax_deductible: false }),
        filters({ taxDeductible: true }),
      ),
    ).toBe(false);
    expect(
      matchesFilters(
        tx({ is_tax_deductible: true }),
        filters({ taxDeductible: true }),
      ),
    ).toBe(true);
    expect(
      matchesFilters(
        tx({ is_tax_deductible: false }),
        filters({ taxDeductible: false }),
      ),
    ).toBe(true);
  });

  it("searches description case-insensitively", () => {
    expect(matchesFilters(tx(), filters({ q: "WEEKLY" }))).toBe(true);
    expect(matchesFilters(tx(), filters({ q: "rent" }))).toBe(false);
  });

  it("searches the category label too", () => {
    expect(matchesFilters(tx({ category: 1 }), filters({ q: "grocer" }))).toBe(
      true,
    );
    expect(
      matchesFilters(tx({ category: null }), filters({ q: "grocer" })),
    ).toBe(false);
  });

  it("ignores the tab and page", () => {
    expect(
      matchesFilters(
        tx({ entry_type: "expense" }),
        filters({ tab: "income", page: 99 }),
      ),
    ).toBe(true);
  });
});

describe("countByTab", () => {
  it("counts each entry type and the total", () => {
    const rows = [
      tx({ id: 1, entry_type: "expense" }),
      tx({ id: 2, entry_type: "expense" }),
      tx({ id: 3, entry_type: "income" }),
      tx({ id: 4, entry_type: "contribution" }),
    ];
    expect(countByTab(rows)).toEqual({
      all: 4,
      expense: 2,
      income: 1,
      contribution: 1,
    });
  });

  it("returns zeros for an empty list", () => {
    expect(countByTab([])).toEqual({
      all: 0,
      expense: 0,
      income: 0,
      contribution: 0,
    });
  });
});

describe("sortTransactions", () => {
  const rows = [
    tx({ id: 2, transaction_date: "2026-03-10" }),
    tx({ id: 1, transaction_date: "2026-03-10" }),
    tx({ id: 3, transaction_date: "2026-03-01" }),
  ];

  it("newest puts later dates first and breaks ties by higher id", () => {
    expect(sortTransactions(rows, "newest").map((t) => t.id)).toEqual([
      2, 1, 3,
    ]);
  });

  it("oldest puts earlier dates first and breaks ties by lower id", () => {
    expect(sortTransactions(rows, "oldest").map((t) => t.id)).toEqual([
      3, 1, 2,
    ]);
  });

  it("does not mutate the input", () => {
    const before = rows.map((t) => t.id);
    sortTransactions(rows, "oldest");
    expect(rows.map((t) => t.id)).toEqual(before);
  });
});

describe("applyFilters", () => {
  it("reports one empty page for no rows", () => {
    expect(applyFilters([], filters())).toEqual({
      page: [],
      total: 0,
      pageCount: 1,
      counts: { all: 0, expense: 0, income: 0, contribution: 0 },
    });
  });

  it("counts tabs before the tab filter, but totals after it", () => {
    const rows = [
      tx({ id: 1, entry_type: "expense" }),
      tx({ id: 2, entry_type: "income" }),
    ];
    const result = applyFilters(rows, filters({ tab: "income" }));
    expect(result.counts).toEqual({
      all: 2,
      expense: 1,
      income: 1,
      contribution: 0,
    });
    expect(result.total).toBe(1);
    expect(result.page.map((t) => t.id)).toEqual([2]);
  });

  it("counts tabs over rows matching the other filters only", () => {
    const rows = [
      tx({ id: 1, entry_type: "expense", is_tax_deductible: true }),
      tx({ id: 2, entry_type: "income", is_tax_deductible: false }),
    ];
    const result = applyFilters(rows, filters({ taxDeductible: true }));
    expect(result.counts).toEqual({
      all: 1,
      expense: 1,
      income: 0,
      contribution: 0,
    });
  });

  it("slices pages of PAGE_SIZE and reports pageCount", () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, i) =>
      tx({ id: i + 1, transaction_date: "2026-01-01" }),
    );
    const first = applyFilters(rows, filters({ sort: "oldest", page: 1 }));
    expect(first.page).toHaveLength(PAGE_SIZE);
    expect(first.pageCount).toBe(2);

    const second = applyFilters(rows, filters({ sort: "oldest", page: 2 }));
    expect(second.page.map((t) => t.id)).toEqual([PAGE_SIZE + 1]);
  });

  it("clamps a page beyond the last one to the last page", () => {
    const rows = [tx({ id: 1 })];
    const result = applyFilters(rows, filters({ page: 7 }));
    expect(result.pageCount).toBe(1);
    expect(result.page.map((t) => t.id)).toEqual([1]);
  });
});
