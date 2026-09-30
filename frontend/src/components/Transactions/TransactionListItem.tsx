/**
 * @file Compact, non-interactive list of transactions. On a desktop viewport
 * with a wide enough list, a row is name and date, category chip, person,
 * amount; otherwise the chip and person columns fold away and only the name,
 * date and amount remain. Both conditions matter: a phone folds, and so does
 * a cramped desktop card beside a wide sidebar.
 *
 * The column tracks live on the list and each row is a subgrid, so an amount
 * or chip that is wider in one row moves the column for every row.
 */

import type { ReactNode } from "react";
import { Box, Chip, Typography, type SxProps, type Theme } from "@mui/material";
import { Money } from "../Money";
import type { Category } from "../../lib/categories";
import { shortDate } from "../../lib/date";
import { ENTRY_STYLE, entryCategoryLabel } from "../../lib/entryDisplay";
import { displayAmount } from "../../lib/money";
import type { Transaction } from "../../lib/transactions";
import { DESKTOP } from "../../pages/Home/layout";

/** Space between rows; the hairline sits halfway down it. */
export const ROW_GAP = 24;

/** List width from which the chip (and person) get columns of their own. */
const WIDE = "@container transaction-list (min-width: 480px)";
const WIDE_WITH_PERSON = "@container transaction-list (min-width: 600px)";

/** Styles under both conditions at once: nested at-rules are valid CSS. */
function whenWide(withPerson: boolean | undefined, styles: object) {
  return { [DESKTOP]: { [withPerson ? WIDE_WITH_PERSON : WIDE]: styles } };
}

interface ListProps {
  /** Adds the person column (shared workspaces). */
  withPerson?: boolean;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function TransactionList({ withPerson, children, sx }: ListProps) {
  return (
    // The wrapper is the query container: a grid cannot query its own width.
    <Box
      sx={[
        { containerType: "inline-size", containerName: "transaction-list" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="ul"
        sx={{
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
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

interface ItemProps {
  transaction: Transaction;
  categories: Category[];
  withPerson?: boolean;
}

/** A row. The divider is drawn into the gap below it; the last row has none. */
export function TransactionListItem({
  transaction: t,
  categories,
  withPerson,
}: ItemProps) {
  const style = ENTRY_STYLE[t.entry_type];
  const category = entryCategoryLabel(t, categories);
  const hidden = { display: "none", minWidth: 0 };
  const shown = whenWide(withPerson, { display: "block" });

  return (
    <Box
      component="li"
      sx={{
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
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {t.description || category || "Untitled"}
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
          {shortDate(t.transaction_date)}
        </Typography>
      </Box>
      {/* Coloured by entry type, the same as the Transactions table. */}
      <Box sx={[hidden, shown]}>
        {category && (
          <Chip
            label={category}
            sx={{
              bgcolor: style.chipBg,
              color: style.color,
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
