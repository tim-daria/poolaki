/** @file Month half of the top card: received, spent and saved as three columns on one baseline. */

import { Box, Stack, Typography } from "@mui/material";
import { Money } from "../../components/Money";
import { displayAmount, displayFigure } from "../../lib/money";
import { monthFooter, type MonthSummary } from "../../lib/overview";
import { HomeCardAction } from "./HomeCard";
import { DESKTOP } from "./layout";

interface Props {
  summary: MonthSummary;
  /** The month's name, e.g. "September". */
  month: string;
  /** Value that fills a full-height column. */
  scaleMax: number;
}

/** Tallest column, per the spec: 64px on phones, 72px from desktop. */
const MAX_HEIGHT = { xs: 64, desktop: 72 };
/** A non-zero value never draws shorter than this; zero is a stub. */
const MIN_HEIGHT = 4;
const STUB_HEIGHT = 3;

// Pastel columns, full-colour labels: the main colours at 30% for money in
// and out, the lavender tint for savings.
const COLUMNS = [
  {
    key: "income",
    label: "Received",
    bar: "success.main",
    barOpacity: 0.3,
    text: "success.main",
  },
  {
    key: "expenses",
    label: "Spent",
    bar: "error.main",
    barOpacity: 0.3,
    text: "error.main",
  },
  {
    key: "saved",
    label: "Saved",
    bar: "secondary.light",
    barOpacity: 1,
    text: "accent.main",
  },
] as const;

function Column({
  value,
  scaleMax,
  bar,
  barOpacity,
  text,
  label,
}: {
  value: number;
  scaleMax: number;
  bar: string;
  barOpacity: number;
  text: string;
  label: string;
}) {
  // Height as a share of the tallest column, resolved per breakpoint below.
  const share = value > 0 ? value / scaleMax : 0;
  const height = (max: number) =>
    value > 0 ? Math.max(MIN_HEIGHT, share * max) : STUB_HEIGHT;

  return (
    <Stack sx={{ alignItems: "center", minWidth: 0 }}>
      <Money
        title={`€${displayAmount(value)}`}
        sx={{
          fontSize: "0.9rem",
          mb: 0.75,
          whiteSpace: "nowrap",
          color: value > 0 ? text : "text.disabled",
        }}
      >
        €{displayFigure(value)}
      </Money>
      <Box
        aria-hidden
        sx={{
          width: "60%",
          maxWidth: 88,
          borderRadius: 1.5,
          height: height(MAX_HEIGHT.xs),
          [DESKTOP]: { height: height(MAX_HEIGHT.desktop) },
          bgcolor: value > 0 ? bar : "divider",
          opacity: value > 0 ? barOpacity : 1,
        }}
      />
      <Typography sx={{ color: "text.secondary", mt: 1 }}>{label}</Typography>
    </Stack>
  );
}

export function MonthlySummaryCard({ summary, month, scaleMax }: Props) {
  const footer = monthFooter(summary);
  const empty = footer.kind === "empty";

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}
    >
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "baseline", gap: 2 }}
      >
        <Typography
          component="h2"
          sx={{ fontWeight: 700, fontSize: "1.15rem" }}
        >
          {month}
        </Typography>
        {!empty && <HomeCardAction>More info</HomeCardAction>}
      </Stack>

      {/* Columns share one baseline: each stacks label then bar at its bottom. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          alignItems: "end",
          columnGap: 2,
          textAlign: "center",
          py: 2,
        }}
      >
        {COLUMNS.map((c) => (
          <Column
            key={c.key}
            value={summary[c.key]}
            scaleMax={scaleMax}
            bar={c.bar}
            barOpacity={c.barOpacity}
            text={c.text}
            label={c.label}
          />
        ))}
      </Box>

      <Typography sx={{ color: "text.secondary", mt: "auto" }}>
        {footer.kind === "empty" && "Nothing this month yet"}
        {footer.kind === "left" && (
          <>
            <Money sx={{ color: "text.primary" }}>
              €{displayFigure(footer.amount)}
            </Money>{" "}
            left after spending and saving
          </>
        )}
        {footer.kind === "over" && (
          <>
            <Money sx={{ color: "error.main" }}>
              €{displayFigure(footer.amount)}
            </Money>{" "}
            more than you received
          </>
        )}
        {footer.kind === "no-income" && (
          <>
            Income not received yet ·{" "}
            <Money sx={{ color: "text.primary" }}>
              €{displayFigure(footer.amount)}
            </Money>{" "}
            spent so far
          </>
        )}
      </Typography>
    </Box>
  );
}
