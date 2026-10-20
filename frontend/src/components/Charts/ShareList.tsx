/** @file Rows of label, whole percent and value, with a share bar on desktop screens; the percents sum to 100. */

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

/** Room for the longest compact figure, so the columns line up row to row. */
const VALUE_WIDTH = 112;
const PERCENT_WIDTH = 44;
/** Desktop: the bar is the only column that gives up room as the card narrows. */
const ROW_COLUMNS = `minmax(0, 0.8fr) minmax(48px, 2fr) ${PERCENT_WIDTH}px ${VALUE_WIDTH}px`;
/**
 * Below desktop and on paper there is no bar: the donut beside the list
 * carries the proportions, and the percent and figure carry the reading.
 */
const COMPACT_COLUMNS = `minmax(0, 1fr) ${PERCENT_WIDTH}px ${VALUE_WIDTH}px`;

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
    <Stack component="ul" spacing={3} sx={{ listStyle: "none", m: 0, p: 0 }}>
      {rows.map((row, i) => {
        const exact = formatExact?.(row.value);
        const shown = formatValue(row.value);
        return (
          <Box
            component="li"
            key={row.id}
            sx={{
              display: "grid",
              gridTemplateColumns: COMPACT_COLUMNS,
              alignItems: "center",
              gap: 1.5,
              [DESKTOP]: { gridTemplateColumns: ROW_COLUMNS, gap: 2 },
              // Last, so it outranks DESKTOP when printing from a wide window.
              [PRINT]: { gridTemplateColumns: COMPACT_COLUMNS, gap: 1.5 },
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
                Left-aligned: the euro signs line up, so the column scans as one. */}
            <Money
              sx={{
                textAlign: "left",
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
    </Stack>
  );
}
