/** @file The year's income and expense totals as two stat tiles. */

import { Box, Paper, Typography } from "@mui/material";
import type { YearlyReportResponse } from "../../lib/reports";
import {
  displayAmount,
  displayFigure,
  isAbbreviated,
  parseMoney,
} from "../../lib/money";
import { TABLET } from "../../lib/layout";
import { Money } from "../../components/Money";

interface SummaryCardsProps {
  totals: YearlyReportResponse["totals"];
  /** Net of the year's transfers. Null when they did not load; the tile is then absent. */
  setAside: number | null;
}

function Tile({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color: "success.main" | "error.main" | "primary.main";
}) {
  // Compact past six digits, as every other figure on Home and Reports; the
  // exact amount stays on hover and for assistive tech.
  const exact = `€${displayAmount(amount)}`;
  return (
    <Paper
      component="section"
      aria-label={label}
      variant="card"
      sx={{ minWidth: 0 }}
    >
      <Typography variant="body2" gutterBottom sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      {/* Weight 500, as the Overview's headline figures carry. */}
      <Typography
        variant="mono"
        sx={{ color, fontWeight: 500, display: "block" }}
      >
        <Money title={exact} aria-label={exact}>
          €{displayFigure(amount)}
        </Money>
      </Typography>
      {/* The abbreviation drops digits and cents; the exact figure follows
          in the secondary line so nothing is lost to a hover. */}
      {isAbbreviated(amount) && (
        <Typography
          variant="body2"
          sx={{ mt: 0.5, color: "text.secondary", whiteSpace: "nowrap" }}
        >
          <Money>{exact}</Money>
        </Typography>
      )}
    </Paper>
  );
}

/**
 * Room for "€999,9 Mrd." in the mono headline plus the card padding, in the
 * root font size so it scales with the type. The exact line beneath may be
 * longer; it is secondary and may clip, the headline never does.
 */
const TILE_MIN_WIDTH = "12rem";

export function SummaryCards({ totals, setAside }: SummaryCardsProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: "minmax(0, 1fr)",
        // Tiles only share a row when each gets room for a compact figure.
        [TABLET]: {
          gap: 3,
          gridTemplateColumns: `repeat(auto-fit, minmax(${TILE_MIN_WIDTH}, 1fr))`,
        },
      }}
    >
      <Tile
        label="Income"
        amount={parseMoney(totals.income)}
        color="success.main"
      />
      <Tile
        label="Expenses"
        amount={parseMoney(totals.expense)}
        color="error.main"
      />
      {setAside !== null && (
        <Tile label="Set aside" amount={setAside} color="primary.main" />
      )}
    </Box>
  );
}
