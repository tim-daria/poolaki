/** @file URL search params ↔ TransactionFilters. Pure, so the hook stays a thin router binding. */

import {
  DEFAULT_FILTERS,
  type Sort,
  type Tab,
  type TransactionFilters,
} from "../../lib/transactionFilters";

const TAB_VALUES: Tab[] = ["all", "expense", "income", "contribution"];
const SORT_VALUES: Sort[] = ["newest", "oldest"];

/** Unknown or malformed values fall back to the defaults rather than failing. */
export function parseFilters(params: URLSearchParams): TransactionFilters {
  const tab = params.get("tab") as Tab | null;
  const sort = params.get("sort") as Sort | null;
  const page = Number(params.get("page"));
  return {
    tab: tab && TAB_VALUES.includes(tab) ? tab : DEFAULT_FILTERS.tab,
    q: params.get("q") ?? "",
    sort: sort && SORT_VALUES.includes(sort) ? sort : DEFAULT_FILTERS.sort,
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    categories: (params.get("cat") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0),
    taxDeductible: params.get("tax") === "1",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Defaults are omitted from the URL so an untouched page has a clean address. */
export function serializeFilters(f: TransactionFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.tab !== DEFAULT_FILTERS.tab) p.set("tab", f.tab);
  if (f.q) p.set("q", f.q);
  if (f.sort !== DEFAULT_FILTERS.sort) p.set("sort", f.sort);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.categories.length) p.set("cat", f.categories.join(","));
  if (f.taxDeductible) p.set("tax", "1");
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}
