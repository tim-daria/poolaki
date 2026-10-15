/** @file One table row of the transactions list, coloured by entry type. */

import { Chip, TableCell, TableRow, Typography } from "@mui/material";
import type { KeyboardEvent } from "react";
import { Money } from "../../components/Money";
import type { Category } from "../../lib/categories";
import { shortDate } from "../../lib/date";
import { ENTRY_STYLE, entryCategoryLabel } from "../../lib/entryDisplay";
import { displayAmount } from "../../lib/money";
import type { Transaction } from "../../lib/transactions";

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
  const style = ENTRY_STYLE[t.entry_type];
  const category = entryCategoryLabel(t, categories);

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
