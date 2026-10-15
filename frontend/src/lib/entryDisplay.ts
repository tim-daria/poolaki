/** @file How an entry type is shown wherever transactions are listed: sign, colours and category label. */

import { categoryById, type Category } from "./categories";
import { isTransfer, type EntryType, type Transaction } from "./transactions";

/**
 * Expenses stay neutral; income is green with a plus; a transfer is lavender
 * and unsigned, since it moves money rather than adding or removing it.
 * Values are theme palette paths for `sx`.
 */
export const ENTRY_STYLE: Record<
  EntryType,
  { sign: string; chipBg: string; color: string }
> = {
  expense: { sign: "-", chipBg: "action.selected", color: "text.primary" },
  income: { sign: "+", chipBg: "success.light", color: "success.main" },
  contribution: { sign: "", chipBg: "primary.light", color: "accent.main" },
  withdraw: { sign: "", chipBg: "primary.light", color: "accent.main" },
};

/**
 * Transfers carry no category on the wire; "Savings" is what they are filed
 * under in the UI. Null for a removed or unknown category.
 */
export function entryCategoryLabel(
  t: Transaction,
  categories: Category[],
): string | null {
  if (isTransfer(t.entry_type)) return "Savings";
  return categoryById(categories, t.category)?.name ?? null;
}
