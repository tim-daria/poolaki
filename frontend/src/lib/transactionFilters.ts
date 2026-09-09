/** @file Client-side filtering, sorting and paging of transactions. Pure functions so the UI and future server params share one contract. */

import type { EntryType, Transaction } from "./transactions";

/**
 * "all" plus the entry types verbatim, so a row's own `entry_type` is the tab
 * it belongs to. The URL therefore carries ?tab=contribution, while the tab
 * itself is labelled "Transfers" in the UI.
 */
export type Tab = "all" | EntryType;
export type Sort = "newest" | "oldest";

export type TransactionFilters = {
  tab: Tab;
  /** Case-insensitive substring match on description and category label. */
  q: string;
  sort: Sort;
  /** ISO dates, inclusive. Empty string means unbounded. */
  from: string;
  to: string;
  /** Category IDs; empty means all. */
  categories: number[];
  /** 1-based. */
  page: number;
};

export const PAGE_SIZE = 15;

export const DEFAULT_FILTERS: TransactionFilters = {
  tab: "all",
  q: "",
  sort: "newest",
  from: "",
  to: "",
  categories: [],
  page: 1,
};

/** Everything except the tab and page, so tab counts reflect the other active filters. */
export function matchesFilters(
  t: Transaction,
  f: TransactionFilters,
  categoryLabel: (id: number | null) => string,
): boolean {
  if (f.from && t.transaction_date < f.from) return false;
  if (f.to && t.transaction_date > f.to) return false;
  if (
    f.categories.length &&
    (t.category === null || !f.categories.includes(t.category))
  )
    return false;
  if (f.q) {
    const needle = f.q.toLowerCase();
    const hay = `${t.description} ${categoryLabel(t.category)}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

export function countByTab(rows: Transaction[]): Record<Tab, number> {
  const counts: Record<Tab, number> = {
    all: rows.length,
    expense: 0,
    income: 0,
    contribution: 0,
  };
  for (const t of rows) counts[t.entry_type]++;
  return counts;
}

export function sortTransactions(
  rows: Transaction[],
  sort: Sort,
): Transaction[] {
  const byDate = (a: Transaction, b: Transaction) =>
    a.transaction_date.localeCompare(b.transaction_date) || a.id - b.id;
  const sorted = [...rows];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => byDate(b, a));
    case "oldest":
      return sorted.sort(byDate);
  }
}

export type FilteredResult = {
  /** Rows on the current page. */
  page: Transaction[];
  /** Rows matching all filters, before paging. */
  total: number;
  pageCount: number;
  /** Per-tab counts over rows matching every filter except the tab. */
  counts: Record<Tab, number>;
};

export function applyFilters(
  rows: Transaction[],
  f: TransactionFilters,
  categoryLabel: (id: number | null) => string,
): FilteredResult {
  const base = rows.filter((t) => matchesFilters(t, f, categoryLabel));
  const counts = countByTab(base);
  const inTab =
    f.tab === "all" ? base : base.filter((t) => t.entry_type === f.tab);
  const sorted = sortTransactions(inTab, f.sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  return {
    page: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    pageCount,
    counts,
  };
}
