/** @file One table row of the transactions list, coloured by entry type. */

import { Chip, TableCell, TableRow, Typography } from "@mui/material";
import type { KeyboardEvent } from "react";
import { Money } from "../../components/Money";
import { categoryById, type Category } from "../../lib/categories";
import { shortDate } from "../../lib/date";
import { displayAmount } from "../../lib/money";
import type { EntryType, Transaction } from "../../lib/transactions";

/**
 * Per-type colouring of the category chip and amount. Expenses stay neutral;
 * income is green with a plus; a transfer is lavender and unsigned, since it
 * moves money rather than adding or removing it.
 */
const ROW_STYLE: Record<
  EntryType,
  { sign: string; chipBg: string; color: string }
> = {
  expense: { sign: "-", chipBg: "action.selected", color: "text.primary" },
  income: { sign: "+", chipBg: "success.light", color: "success.main" },
  contribution: { sign: "", chipBg: "primary.light", color: "accent.main" },
};

/**
 * Contributions carry no category on the wire; "Savings" is what they are
 * filed under in the UI.
 */
function categoryLabel(t: Transaction, categories: Category[]): string | null {
  if (t.entry_type === "contribution") return "Savings";
  return categoryById(categories, t.category)?.name ?? null;
}

interface TransactionRowProps {
  transaction: Transaction;
  /** Opens the row for editing. */
  onClick?: (t: Transaction) => void;
  categories: Category[];
}

export function TransactionRow({
  transaction: t,
  onClick,
  categories: categories,
}: TransactionRowProps) {
  const style = ROW_STYLE[t.entry_type];
  const category = categoryLabel(t, categories);

  return (
    <TableRow
      hover
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick && (() => onClick(t))}
      // Enter and Space, the two keys that activate a button.
      onKeyDown={
        onClick &&
        ((e: KeyboardEvent<HTMLTableRowElement>) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          onClick(t);
        })
      }
      sx={{
        cursor: onClick ? "pointer" : undefined,
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
        },
      }}
    >
      <TableCell sx={{ color: "text.secondary", py: 2 }}>
        {shortDate(t.transaction_date)}
      </TableCell>
      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t.description}</TableCell>
      <TableCell sx={{ py: 2 }}>
        {category ? (
          <Chip
            label={category}
            sx={{ bgcolor: style.chipBg, color: style.color, fontWeight: 500 }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      {/* nowrap: browsers may break a line after "-", which would put the
          sign and the amount on separate lines in a narrow cell. */}
      <TableCell align="right" sx={{ py: 2, whiteSpace: "nowrap" }}>
        <Money sx={{ fontSize: "1rem", color: style.color }}>
          {style.sign}€{displayAmount(t.amount)}
        </Money>
      </TableCell>
    </TableRow>
  );
}
