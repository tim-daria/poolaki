/** @file The transaction list's filter state: the shape the URL, the page and fetchTransactionPage share. Matching, counting and paging happen on the backend. */

import type { EntryType } from "./transactions";

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
  /** True keeps only tax-deductible rows; false is "no filter", not "non-deductible". */
  taxDeductible: boolean;
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
  taxDeductible: false,
  page: 1,
};
