/**
 * @file Compact list of transactions. On a desktop viewport with a wide
 * enough list, a row is name and date, category chip, person, amount;
 * otherwise the chip and person columns fold away and only the name, date
 * and amount remain. Both conditions matter: a phone folds, and so does a
 * cramped desktop card beside a wide sidebar.
 *
 * The column tracks live on the list and each row is a subgrid, so an amount
 * or chip that is wider in one row moves the column for every row. Rows are
 * read-only (Home) unless given `onClick` (the Transactions page).
 */

import type { KeyboardEvent, ReactNode } from "react";
import { Box, Chip, Typography, type SxProps, type Theme } from "@mui/material";
import { Money } from "../Money";
import type { Category } from "../../lib/categories";
import { shortDate } from "../../lib/date";
import {
  ENTRY_STYLE,
  entryCategoryLabel,
  entrySubtitle,
  entryTitle,
} from "../../lib/entryDisplay";
import type { Goal } from "../../lib/goals";
import { displayAmount } from "../../lib/money";
import type { Transaction } from "../../lib/transactions";
import { TABLET } from "../../lib/layout";

/** Space between rows; the hairline sits halfway down it. */
export const ROW_GAP = 24;

/** List width from which the chip (and person) get columns of their own. */
const WIDE = "@container transaction-list (min-width: 480px)";
const WIDE_WITH_PERSON = "@container transaction-list (min-width: 600px)";

/** Styles under both conditions at once: nested at-rules are valid CSS. */
function whenWide(withPerson: boolean | undefined, styles: object) {
  return { [TABLET]: { [withPerson ? WIDE_WITH_PERSON : WIDE]: styles } };
}

interface ListProps {
  /** Adds the person column (shared workspaces). */
  withPerson?: boolean;
  /** Names the list for assistive tech on a page with other lists. */
  "aria-label"?: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function TransactionList({
  withPerson,
  "aria-label": ariaLabel,
  children,
  sx,
}: ListProps) {
  return (
    // The wrapper is the query container: a grid cannot query its own width.
    <Box
      sx={{
        containerType: "inline-size",
        containerName: "transaction-list",
      }}
    >
      <Box
        component="ul"
        aria-label={ariaLabel}
        sx={[
          {
            listStyle: "none",
            m: 0,
            p: 0,
            display: "grid",
            rowGap: `${ROW_GAP}px`,
            gridTemplateColumns: "minmax(0, 1fr) auto",
            // Priority when room runs out: the amount is never shortened, the
            // name keeps a floor, and the chip and person share what is left
            // and truncate first. With room to spare the name takes 1.5 shares
            // to their one each.
            ...whenWide(withPerson, {
              gridTemplateColumns: withPerson
                ? "minmax(120px, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) max-content"
                : "minmax(120px, 1.5fr) minmax(0, 1fr) max-content",
            }),
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {children}
      </Box>
    </Box>
  );
}

/**
 * Hover tint and focus ring for a clickable row, drawn on a pseudo-element
 * so the subgrid tracks and the hairline stay put. It bleeds to the card's
 * edges, which keeps it aligned with the controls above the list; the
 * vertical inset stops short of the hairline at half the gap.
 */
const interactiveSx = {
  cursor: "pointer",
  outline: "none",
  isolation: "isolate",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: `${-ROW_GAP / 3}px calc(-1 * var(--card-padding, 12px))`,
    zIndex: -1,
    pointerEvents: "none",
  },
  "&:hover::before": { bgcolor: "action.hover" },
  "&:focus-visible::before": {
    boxShadow: (t: Theme) => `inset 0 0 0 2px ${t.palette.primary.main}`,
  },
} as const;

interface ItemProps {
  transaction: Transaction;
  categories: Category[];
  /** For the subtitle: the goal an expense was paid from, or an archive row's meaning. */
  goals: Goal[];
  withPerson?: boolean;
  /** Opens the row for editing. Absent on Home, where the list is read-only. */
  onClick?: (t: Transaction) => void;
}

/**
 * A row. The divider is drawn into the gap below it; the last row has none.
 * A clickable row stays a list item: it has no nested control, its content
 * is its accessible name, and a real button cannot be a subgrid row.
 */
export function TransactionListItem({
  transaction: t,
  categories,
  goals,
  withPerson,
  onClick,
}: ItemProps) {
  const style = ENTRY_STYLE[t.entry_type];
  const category = entryCategoryLabel(t, categories);
  const subtitle = entrySubtitle(t, goals);
  const hidden = { display: "none", minWidth: 0 };
  const shown = whenWide(withPerson, { display: "block" });

  return (
    <Box
      component="li"
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick && (() => onClick(t))}
      // Enter and Space, the two keys that activate a button.
      onKeyDown={
        onClick &&
        ((e: KeyboardEvent<HTMLLIElement>) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          onClick(t);
        })
      }
      sx={[
        {
          display: "grid",
          gridColumn: "1 / -1",
          gridTemplateColumns: "subgrid",
          alignItems: "center",
          columnGap: 3,
          position: "relative",
          "&:not(:last-child)::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -ROW_GAP / 2,
            borderBottom: "1px solid var(--mui-palette-divider)",
          },
        },
        Boolean(onClick) && interactiveSx,
      ]}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {entryTitle(t, categories, goals)}
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
          {shortDate(t.transaction_date)}
          {subtitle && ` · ${subtitle}`}
        </Typography>
      </Box>
      {/* Coloured by entry type, the same as the Transactions table. */}
      <Box sx={[hidden, shown]}>
        {category && (
          <Chip
            label={category}
            sx={{
              bgcolor: style.chipBg,
              color: style.chipColor ?? style.color,
              fontWeight: 500,
              maxWidth: "100%",
            }}
          />
        )}
      </Box>
      {withPerson && (
        <Typography
          variant="body2"
          noWrap
          sx={[hidden, shown, { color: "text.secondary" }]}
        >
          {t.created_by && `by ${t.created_by}`}
        </Typography>
      )}
      {/* nowrap keeps the sign on the same line as the amount. */}
      <Money
        sx={{
          fontSize: "1rem",
          color: style.color,
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {style.sign}€{displayAmount(t.amount)}
      </Money>
    </Box>
  );
}
