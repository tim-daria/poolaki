/** @file Monthly summary card: this month's received, spent and saved totals as three bars. */

import { Box, Typography } from "@mui/material";
import { Money } from "../../components/Money";
import { displayAmount } from "../../lib/money";
import type { MonthSummary } from "../../lib/overview";
import { HomeCard, PlaceholderBar } from "./HomeCard";

interface Props {
  summary: MonthSummary;
  month: string;
  daysLeft: number;
}

/** Tallest bar; the others scale against the largest total. */
const chartHeight = 150;

/** A non-zero total never renders thinner than this, so it stays visible. */
const minBarHeight = 6;

const columnsSx = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  columnGap: 2,
  textAlign: "center",
} as const;

const barSx = {
  width: "70%",
  maxWidth: 96,
  mx: "auto",
  borderRadius: "12px 12px 0 0",
} as const;

export function MonthlySummaryCard({ summary, month, daysLeft }: Props) {
  const { income, expenses, saved, left } = summary;

  const columns = [
    {
      label: "received",
      amount: income,
      text: "success.main",
      bar: "success.main",
    },
    { label: "spent", amount: expenses, text: "error.main", bar: "error.main" },
    {
      label: "saved",
      amount: saved,
      text: "accent.main",
      bar: "secondary.light",
    },
  ];

  const empty = columns.every((c) => c.amount === 0);
  const max = Math.max(...columns.map((c) => c.amount));

  return (
    <HomeCard title="Monthly Summary">
      <Box>
        {/* Bars sit on a shared baseline; each amount rides on top of its bar. */}
        <Box
          sx={[
            columnsSx,
            {
              alignItems: "end",
              height: chartHeight + 36,
              borderBottom: "1px solid",
              borderColor: "divider",
            },
          ]}
        >
          {columns.map((c, i) => {
            const height = empty
              ? [0.5, 0.35, 0.25][i] * chartHeight
              : c.amount === 0
                ? 0
                : Math.max(minBarHeight, (c.amount / max) * chartHeight);
            return (
              <Box key={c.label} sx={{ minWidth: 0 }}>
                {empty ? (
                  <Typography sx={{ color: "text.disabled", mb: 1 }}>
                    —
                  </Typography>
                ) : (
                  <Money
                    sx={{
                      display: "block",
                      mb: 1,
                      // Three cards share a row from `md`, where a full
                      // two-decimal amount needs the smaller size to fit.
                      fontSize: { xs: "0.95rem", md: "0.9rem", xl: "1rem" },
                      fontWeight: 600,
                      color: c.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    €{displayAmount(c.amount)}
                  </Money>
                )}
                {empty ? (
                  <PlaceholderBar sx={[barSx, { height }]} />
                ) : (
                  <Box
                    aria-hidden
                    sx={[
                      barSx,
                      {
                        height,
                        bgcolor: c.bar,
                        // Pastel fills: the amounts above carry full colour.
                        opacity: c.bar === "secondary.light" ? 1 : 0.3,
                      },
                    ]}
                  />
                )}
              </Box>
            );
          })}
        </Box>
        <Box sx={[columnsSx, { pt: 1 }]}>
          {columns.map((c) => (
            <Typography key={c.label} sx={{ color: "text.secondary" }}>
              {c.label}
            </Typography>
          ))}
        </Box>
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: !empty && left < 0 ? "error.main" : "text.secondary",
          mt: "auto",
        }}
      >
        {empty ? (
          <>
            Your {month} summary appears after this month's first transaction.
          </>
        ) : left >= 0 ? (
          <>
            You're on track ·{" "}
            <Money sx={{ color: "text.primary" }}>€{displayAmount(left)}</Money>{" "}
            left for {daysLeft} {daysLeft === 1 ? "day" : "days"}
          </>
        ) : (
          <>
            Over budget by <Money>€{displayAmount(-left)}</Money> this month
          </>
        )}
      </Typography>
    </HomeCard>
  );
}
