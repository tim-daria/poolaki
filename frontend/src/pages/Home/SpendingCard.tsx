/** @file Spending by category card: a pie of this month's expenses with an amount and share legend. */

import { Box, Stack, Typography, useTheme } from "@mui/material";
import { Money } from "../../components/Money";
import { displayAmount } from "../../lib/money";
import type { SpendingSlice } from "../../lib/overview";
import { HomeCard, PlaceholderBar } from "./HomeCard";

interface Props {
  slices: SpendingSlice[];
  month: string;
}

const pieSize = { xs: 180, sm: 220 };

/**
 * conic-gradient stops for the slices. Built from amounts, not the rounded
 * percentages, so the drawing is exact even where the legend rounds.
 */
function pieGradient(slices: SpendingSlice[], colors: string[]): string {
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  let start = 0;
  const stops = slices.map((s, i) => {
    const end = start + (s.amount / total) * 100;
    const stop = `${colors[i % colors.length]} ${start}% ${end}%`;
    start = end;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

const legendRowSx = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto 3.5rem",
  alignItems: "center",
  columnGap: 2,
  py: 1.5,
  borderBottom: "1px solid",
  borderColor: "divider",
} as const;

const dotSx = { width: 10, height: 10, borderRadius: "50%" } as const;

export function SpendingCard({ slices, month }: Props) {
  const colors = useTheme().palette.chart;
  const total = slices.reduce((sum, s) => sum + s.amount, 0);

  if (total === 0) {
    return (
      <HomeCard title="Spending by Category">
        <Box
          aria-hidden
          sx={{
            width: pieSize,
            height: pieSize,
            mx: "auto",
            borderRadius: "50%",
            border: "28px solid",
            borderColor: "primary.light",
          }}
        />
        <Box>
          {[140, 180].map((width) => (
            <Box key={width} sx={legendRowSx} aria-hidden>
              <Box sx={[dotSx, { bgcolor: "primary.light" }]} />
              <PlaceholderBar sx={{ width, maxWidth: "100%" }} />
              <span />
              <Typography sx={{ color: "text.disabled", textAlign: "right" }}>
                —
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", textAlign: "center" }}
        >
          No expenses in {month} yet.
        </Typography>
      </HomeCard>
    );
  }

  return (
    <HomeCard title="Spending by Category">
      {/* The legend below carries the same figures as text. */}
      <Box
        role="img"
        aria-label={slices.map((s) => `${s.label} ${s.percent}%`).join(", ")}
        sx={{
          width: pieSize,
          height: pieSize,
          mx: "auto",
          borderRadius: "50%",
          background: pieGradient(slices, colors),
        }}
      />
      <Stack component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {slices.map((s, i) => (
          <Box component="li" key={s.label} sx={legendRowSx}>
            <Box sx={[dotSx, { bgcolor: colors[i % colors.length] }]} />
            <Typography sx={{ fontWeight: 500 }} noWrap>
              {s.label}
            </Typography>
            <Money
              sx={{ fontSize: "0.95rem", color: "text.primary", opacity: 0.75 }}
            >
              €{displayAmount(s.amount)}
            </Money>
            <Money
              sx={{
                fontSize: "0.95rem",
                color: "text.secondary",
                textAlign: "right",
              }}
            >
              {s.percent}%
            </Money>
          </Box>
        ))}
      </Stack>
    </HomeCard>
  );
}
