/** @file Rows of label, whole percent and value, with a share bar on desktop screens; the percents sum to 100. One grid for the whole list, so the figure column is as wide as its widest value and the bars take the rest. */

import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import { shareLabel, wholePercents } from "../../lib/overview";
import { DESKTOP, PRINT } from "../../lib/layout";
import { Money } from "../Money";

export interface ShareRow {
  id: string | number;
  label: string;
  value: number;
  color: string;
}

interface ShareListProps {
  rows: ShareRow[];
  /** What the row shows. Abbreviate here; the exact figure goes in formatExact. */
  formatValue: (value: number) => string;
  /** The unabbreviated figure, for assistive tech and the hover title. */
  formatExact?: (value: number) => string;
  emptyText: string;
}

/**
 * A non-zero row never draws an empty bar: it keeps a sliver, the way the
 * donut lifts a tiny slice, so "present but small" reads differently from
 * nothing at all. The figure beside it carries the true amount.
 */
const MIN_BAR_SHARE = 1;

/**
 * Percent and figure columns size to their widest row, so they line up row
 * to row whatever the amounts. Desktop: the bar is the only column that gives
 * up room as the figures widen or the card narrows.
 */
const ROW_COLUMNS = "minmax(0, 0.8fr) minmax(0, 2fr) max-content max-content";
/**
 * Below desktop and on paper there is no bar: the donut beside the list
 * carries the proportions, and the percent and figure carry the reading.
 */
const COMPACT_COLUMNS = "minmax(0, 1fr) max-content max-content";

export function ShareList({
  rows,
  formatValue,
  formatExact,
  emptyText,
}: ShareListProps) {
  if (rows.length === 0) {
    return (
      <Typography sx={{ color: "text.secondary" }}>{emptyText}</Typography>
    );
  }
  const percents = wholePercents(rows.map((r) => r.value));
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  // The bar takes the true share, not the rounded one, so a category worth a
  // fraction of a percent still shows a sliver rather than nothing.
  const shareOf = (value: number) => {
    if (value <= 0 || total <= 0) return 0;
    return Math.max((value / total) * 100, MIN_BAR_SHARE);
  };

  return (
    // The list is the grid and each row a subgrid of it: the content-sized
    // columns are then measured across every row, not per row.
    <Box
      component="ul"
      sx={{
        listStyle: "none",
        m: 0,
        p: 0,
        display: "grid",
        gridTemplateColumns: COMPACT_COLUMNS,
        rowGap: 3,
        columnGap: 1.5,
        [DESKTOP]: { gridTemplateColumns: ROW_COLUMNS, columnGap: 2 },
        // Last, so it outranks DESKTOP when printing from a wide window.
        [PRINT]: { gridTemplateColumns: COMPACT_COLUMNS, columnGap: 1.5 },
      }}
    >
      {rows.map((row, i) => {
        const exact = formatExact?.(row.value);
        const shown = formatValue(row.value);
        return (
          <Box
            component="li"
            key={row.id}
            sx={{
              display: "grid",
              gridColumn: "1 / -1",
              gridTemplateColumns: "subgrid",
              alignItems: "center",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", minWidth: 0 }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 0.75,
                  flexShrink: 0,
                  bgcolor: row.color,
                }}
              />
              <Typography noWrap variant="body2" sx={{ fontWeight: 500 }}>
                {row.label}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={shareOf(row.value)}
              aria-hidden
              sx={{
                height: 8,
                borderRadius: 999,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": { bgcolor: row.color },
                display: "none",
                [DESKTOP]: { display: "block" },
                [PRINT]: { display: "none" },
              }}
            />
            <Money
              sx={{
                textAlign: "right",
                color: "text.secondary",
                fontSize: "0.875rem",
              }}
            >
              {shareLabel({
                label: row.label,
                amount: row.value,
                percent: percents[i],
              })}
            </Money>
            {/* Mono at the row's own size and weight, as amounts read elsewhere.
                Right-aligned: the digits end on one edge, as in a ledger. */}
            <Money
              sx={{
                textAlign: "right",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
              }}
              title={exact !== shown ? exact : undefined}
              aria-label={exact !== shown ? exact : undefined}
            >
              {shown}
            </Money>
          </Box>
        );
      })}
    </Box>
  );
}
