/** @file Transaction filters as URL search params, so filtered views survive reload and can be shared. */

import { useSearchParams } from "react-router";
import {
  DEFAULT_FILTERS,
  type Sort,
  type Tab,
  type TransactionFilters,
} from "../../lib/transactionFilters";

const TAB_VALUES: Tab[] = ["all", "expense", "income", "contribution"];
const SORT_VALUES: Sort[] = ["newest", "oldest"];

function parseFilters(params: URLSearchParams): TransactionFilters {
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
function serializeFilters(f: TransactionFilters): URLSearchParams {
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

export function useTransactionFilters() {
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);

  /**
   * Any change other than the page itself resets to page 1.
   *
   * Builds on `window.location.search`, not on `params` or the functional
   * form of `setParams`: both hand back the params of the last render, and
   * navigation commits under a transition, so two updates before that
   * re-render (a date range filled quickly) would drop the first. The data
   * router writes history synchronously, so the live URL is always current.
   * `replace` keeps filtering out of the history stack: Back leaves the
   * page, it does not step through every keystroke.
   */
  const update = (
    patch:
      | Partial<TransactionFilters>
      | ((current: TransactionFilters) => Partial<TransactionFilters>),
  ) => {
    const current = parseFilters(new URLSearchParams(window.location.search));
    const resolved = typeof patch === "function" ? patch(current) : patch;
    const next = { ...current, ...resolved };
    if (!("page" in resolved)) next.page = 1;
    setParams(serializeFilters(next), { replace: true });
  };

  // Functional form for the same reason: two chips clicked in quick
  // succession must both land.
  const toggleCategory = (id: number) =>
    update((f) => ({
      categories: f.categories.includes(id)
        ? f.categories.filter((c) => c !== id)
        : [...f.categories, id],
    }));

  /** Clears the filter panel's fields. Search, tab and sort survive. */
  const clear = () =>
    update({ from: "", to: "", categories: [], taxDeductible: false });

  const activeCount =
    Number(Boolean(filters.from || filters.to)) +
    filters.categories.length +
    Number(filters.taxDeductible);

  return { filters, update, toggleCategory, clear, activeCount };
}

export type TransactionFiltersApi = ReturnType<typeof useTransactionFilters>;
