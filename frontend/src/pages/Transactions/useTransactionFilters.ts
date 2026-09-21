/** @file Transaction filters as URL search params, so filtered views survive reload and can be shared. */

import { useSearchParams } from "react-router";
import type { TransactionFilters } from "../../lib/transactionFilters";
import { parseFilters, serializeFilters } from "./transactionFilterParams";

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
