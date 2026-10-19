/** @file The year's income and expense totals as two stat tiles. */

import { Box, Paper, Typography } from "@mui/material";
import type { YearlyReportResponse } from "../../lib/reports";
import { displayAmount, parseMoney } from "../../lib/money";
import { TABLET } from "../../lib/layout";
import { Money } from "../../components/Money";

const euros = (n: number) => `€${displayAmount(n)}`;

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
  amount: string;
  color: "success.main" | "error.main" | "primary.main";
}) {
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
        <Money>{amount}</Money>
      </Typography>
    </Paper>
  );
}

export function SummaryCards({ totals, setAside }: SummaryCardsProps) {
  const tiles = setAside === null ? 2 : 3;
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: "minmax(0, 1fr)",
        [TABLET]: {
          gap: 3,
          gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))`,
        },
      }}
    >
      <Tile
        label="Income"
        amount={euros(parseMoney(totals.income))}
        color="success.main"
      />
      <Tile
        label="Expenses"
        amount={euros(parseMoney(totals.expense))}
        color="error.main"
      />
      {setAside !== null && (
        <Tile label="Set aside" amount={euros(setAside)} color="primary.main" />
      )}
    </Box>
  );
}
