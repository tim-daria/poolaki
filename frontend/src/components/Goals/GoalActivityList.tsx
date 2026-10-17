/** @file A goal's activity: rows grouped by month, newest first. Each row is a name, a date line and, for an expense the goal could not cover, a red line saying what the balance paid. Not interactive. */

import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { Money } from "../Money";
import { shortDate } from "../../lib/date";
import {
  groupByMonth,
  type ActivityKind,
  type SplitEntry,
} from "../../lib/goalActivity";
import { displayAmount, displayFigure } from "../../lib/money";

interface Props {
  rows: SplitEntry[];
  /** Shown when the goal has no activity. */
  emptyText: string;
  loading: boolean;
  failed: boolean;
}

/** Sign and amount colour per kind, and the row name when the entry has no description. */
const KIND_STYLE: Record<
  ActivityKind,
  { sign: string; color: string; title: string }
> = {
  spent: { sign: "-", color: "text.primary", title: "Expense" },
  added: { sign: "+", color: "accent.main", title: "Added" },
  withdrawn: { sign: "-", color: "text.primary", title: "Withdrawn" },
};

export function GoalActivityList({ rows, emptyText, loading, failed }: Props) {
  let body: ReactNode;
  if (loading) body = <Note>Loading activity…</Note>;
  else if (failed) body = <Note>Could not load activity.</Note>;
  else if (rows.length === 0) body = <Note>{emptyText}</Note>;
  else
    body = groupByMonth(rows).map((g) => (
      <Box key={g.key} component="section" aria-label={g.label}>
        <Typography
          variant="overline"
          component="h4"
          sx={{
            display: "block",
            color: "text.secondary",
            pb: 0.5,
            borderBottom: "1px solid var(--mui-palette-divider)",
          }}
        >
          {g.label}
        </Typography>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {g.rows.map((row) => (
            <ActivityRow key={row.id} row={row} />
          ))}
        </Box>
      </Box>
    ));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography component="h3" sx={{ fontWeight: 700 }}>
        Activity
      </Typography>
      {body}
    </Box>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      {children}
    </Typography>
  );
}

/** "€220 from balance" for a partly covered expense, "from balance" for one the goal paid nothing of. */
function balanceNote(row: SplitEntry): string | null {
  if (row.fromBalance === 0) return null;
  return row.fromGoal > 0
    ? `€${displayFigure(row.fromBalance)} from balance`
    : "from balance";
}

function ActivityRow({ row }: { row: SplitEntry }) {
  const style = KIND_STYLE[row.kind];
  const note = balanceNote(row);
  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        py: 1.5,
        "&:not(:last-child)": {
          borderBottom: "1px solid var(--mui-palette-divider)",
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap>{row.description || style.title}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {shortDate(row.date)}
          {row.reachedTarget && " · target reached"}
        </Typography>
        {note && (
          <Typography variant="body2" sx={{ color: "error.main" }}>
            {note}
          </Typography>
        )}
      </Box>
      <Money sx={{ color: style.color, whiteSpace: "nowrap" }}>
        {style.sign}€{displayAmount(row.amount)}
      </Money>
    </Box>
  );
}
