/** @file One table row of the transactions list, coloured by entry type. */

import { Chip, TableCell, TableRow, Typography } from "@mui/material";
import type { KeyboardEvent } from "react";
import { Money } from "../../components/Money";
import { categoryById } from "../../lib/categories";
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
function categoryLabel(t: Transaction): string | null {
  if (t.entry_type === "contribution") return "Savings";
  return categoryById(t.category)?.label ?? null;
}

interface TransactionRowProps {
  transaction: Transaction;
  /** Opens the row for editing. */
  onClick?: (t: Transaction) => void;
}

export function TransactionRow({
  transaction: t,
  onClick,
}: TransactionRowProps) {
  const style = ROW_STYLE[t.entry_type];
  const category = categoryLabel(t);

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
      <TableCell align="right" sx={{ py: 2 }}>
        <Money sx={{ fontSize: "1rem", color: style.color }}>
          {style.sign}€{displayAmount(t.amount)}
        </Money>
      </TableCell>
    </TableRow>
  );
}
