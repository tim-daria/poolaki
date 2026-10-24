/**
 * @file Month half of the top card: came in, spent and the goal total as
 * three columns on one baseline, a note on what they mean, a link to the
 * year's report, and a footer with the month's net. An abbreviated figure
 * is a button that swaps in the exact amount.
 */

import { useState } from "react";
import { Link as RouterLink } from "react-router";
import {
  Box,
  ButtonBase,
  IconButton,
  Link,
  Paper,
  Stack,
  Tooltip,
  Typography,
  type Theme,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Money } from "../../components/Money";
import { displayAmount, displayFigure, isAbbreviated } from "../../lib/money";
import { monthFooter, type MonthSummary } from "../../lib/overview";
import { CardAction, CardProblem } from "../../components/Card/Card";
import { DESKTOP } from "../../lib/layout";
import { REPORT_UNAVAILABLE } from "../../lib/reports";

interface Props {
  /** Null when the report did not load; the card then says so. */
  summary: MonthSummary | null;
  /** The month's name, e.g. "September". */
  month: string;
  /** The year the report cue points at. */
  year: number;
  /** Value that fills a full-height column. */
  scaleMax: number;
}

/** Tallest column, per the spec: 64px on phones, 72px from desktop. */
const MAX_HEIGHT = { xs: 64, desktop: 72 };
/** A non-zero value never draws shorter than this; zero is a stub. */
const MIN_HEIGHT = 4;
const STUB_HEIGHT = 3;
/** Bar corners, in theme radius units: the same 1.5 the other rounded fills use. */
const BAR_RADIUS = 1.5;
/** Bars carry half weight, as in Reports; the figure above them does not. */
const BAR_OPACITY = 0.5;
/** The figure above each bar: its size and the gap to the bar, in spacing units. */
const FIGURE_SIZE = "0.9rem";
const FIGURE_GAP = 0.75;

/**
 * A column's fixed height: the tallest bar plus the room its figure takes
 * above it. Reserved whatever the values, so the chart never changes height
 * as rows are added. The figure's line height follows body text.
 */
function columnHeight(t: Theme, max: number): string {
  const line = t.typography.body1.lineHeight ?? 1.5;
  return `calc(${max}px + ${FIGURE_SIZE} * ${line} + ${t.spacing(FIGURE_GAP)})`;
}

/** What the columns cover and how they relate to the balance figure beside them. */
function monthInfo(month: string): string {
  return `Everything that came in or was spent since 1 ${month}, and what your goals hold right now.`;
}

// Columns at half strength under full-colour labels, the same three tones the
// Reports charts use. The sign says which way the money moved; the goal total
// carries none, since it is held rather than gone.
const COLUMNS = [
  {
    key: "income",
    label: "Came in",
    sign: "+",
    bar: "success.main",
    barOpacity: BAR_OPACITY,
    text: "success.main",
  },
  {
    key: "expenses",
    label: "Spent",
    sign: "-",
    bar: "error.main",
    barOpacity: BAR_OPACITY,
    text: "error.main",
  },
  {
    key: "inGoals",
    label: "Total in goals",
    sign: "",
    bar: "accent.main",
    barOpacity: BAR_OPACITY,
    text: "accent.main",
  },
] as const;

const GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  columnGap: 2,
  textAlign: "center",
} as const;

/**
 * The figure above a bar. Up to six digits it is plain text. Past that it is
 * abbreviated and becomes a button: one tap swaps in the exact amount as a
 * card-styled pill that fills the figure's own line box, so it reads above
 * the neighbouring bars without leaving the room the column reserves; the
 * next tap shortens it again. The dotted underline is the only cue that it
 * can be tapped.
 */
function ColumnFigure({
  value,
  sign,
  color,
}: {
  value: number;
  sign: string;
  color: string;
}) {
  const [expanded, setExpanded] = useState(false);
  // An overdrawn goal takes the total below zero; the sign then comes from
  // the value, not the column.
  const shownSign = value > 0 ? sign : value < 0 ? "-" : "";
  const magnitude = Math.abs(value);
  const exact = `${shownSign}€${displayAmount(magnitude)}`;
  const figureSx = {
    fontSize: FIGURE_SIZE,
    whiteSpace: "nowrap",
    color: value > 0 ? color : "text.disabled",
  } as const;

  if (!isAbbreviated(magnitude)) {
    return (
      <Money title={exact} sx={{ ...figureSx, mb: FIGURE_GAP }}>
        {shownSign}€{displayFigure(magnitude)}
      </Money>
    );
  }

  return (
    <ButtonBase
      aria-pressed={expanded}
      aria-label={exact}
      title={expanded ? "Tap to shorten" : exact}
      onClick={() => setExpanded((e) => !e)}
      sx={{
        mb: FIGURE_GAP,
        borderRadius: 1,
        "&:focus-visible": {
          outline: (t) => `${t.spacing(0.25)} solid ${t.palette.primary.main}`,
        },
      }}
    >
      {/* Kept in flow while hidden, so the column holds its height. */}
      <Money
        sx={{
          ...figureSx,
          textDecoration: "underline dotted",
          textUnderlineOffset: "0.2em",
          visibility: expanded ? "hidden" : "visible",
        }}
      >
        {shownSign}€{displayFigure(magnitude)}
      </Money>
      {/* Bound to the hidden figure's line box, so it can never grow
          past the room the column reserves for it. */}
      {expanded && (
        <Paper
          variant="card"
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            px: 1.5,
            borderRadius: 999,
            zIndex: 1,
          }}
        >
          <Money sx={figureSx}>{exact}</Money>
        </Paper>
      )}
    </ButtonBase>
  );
}

function Column({
  value,
  scaleMax,
  bar,
  barOpacity,
  text,
  sign,
}: {
  value: number;
  scaleMax: number;
  bar: string;
  barOpacity: number;
  text: string;
  sign: string;
}) {
  // Height as a share of the tallest column, resolved per breakpoint below.
  const share = value > 0 ? value / scaleMax : 0;
  const height = (max: number) =>
    value > 0 ? Math.max(MIN_HEIGHT, share * max) : STUB_HEIGHT;

  return (
    <Stack
      sx={(t) => ({
        alignItems: "center",
        justifyContent: "flex-end",
        minWidth: 0,
        height: columnHeight(t, MAX_HEIGHT.xs),
        [DESKTOP]: { height: columnHeight(t, MAX_HEIGHT.desktop) },
      })}
    >
      <ColumnFigure value={value} sign={sign} color={text} />
      <Box
        aria-hidden
        sx={{
          width: "60%",
          maxWidth: 88,
          // Top corners only, so the bar rests on the baseline.
          borderRadius: (t) => {
            const r = `${BAR_RADIUS * Number(t.shape.borderRadius)}px`;
            return `${r} ${r} 0 0`;
          },
          height: height(MAX_HEIGHT.xs),
          [DESKTOP]: { height: height(MAX_HEIGHT.desktop) },
          bgcolor: value > 0 ? bar : "divider",
          opacity: value > 0 ? barOpacity : 1,
        }}
      />
    </Stack>
  );
}

export function MonthlySummaryCard({ summary, month, year, scaleMax }: Props) {
  const footer = summary && monthFooter(summary);
  const empty = !footer || footer.kind === "empty";
  const info = monthInfo(month);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}
    >
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "baseline", gap: 2 }}
      >
        <Stack direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
          <Typography
            component="h2"
            sx={{ fontWeight: 700, fontSize: "1.15rem" }}
          >
            {month} so far
          </Typography>
          {/* A real button: it opens on hover, focus and touch alike, and
              the tooltip's text is its accessible description. */}
          <Tooltip title={info} arrow>
            <IconButton
              size="small"
              aria-label="What this shows"
              sx={{ p: 0.5, color: "text.secondary" }}
            >
              <InfoOutlinedIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Tooltip>
        </Stack>
        {/* The card is not a link, so the cue is one. */}
        {!empty && (
          <Link component={RouterLink} to="reports" underline="hover">
            <CardAction>{year} report</CardAction>
          </Link>
        )}
      </Stack>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Money in and out
      </Typography>

      {!footer && <CardProblem>{REPORT_UNAVAILABLE}</CardProblem>}

      {/* Columns share one baseline: the bars end on a hairline that the
          labels sit under. */}
      {footer && (
        <>
          <Box sx={{ pt: 2 }}>
            <Box
              sx={{
                ...GRID,
                alignItems: "end",
                borderBottom: "1px solid var(--mui-palette-divider)",
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
                  sign={c.sign}
                />
              ))}
            </Box>
            <Box sx={{ ...GRID, mt: 1, pb: 2 }}>
              {COLUMNS.map((c) => (
                <Typography key={c.key} sx={{ color: "text.secondary" }}>
                  {c.label}
                </Typography>
              ))}
            </Box>
          </Box>

          <Typography sx={{ color: "text.secondary", mt: "auto" }}>
            {footer.kind === "empty" && "Nothing this month yet"}
            {footer.kind === "left" && (
              <>
                <Money sx={{ color: "text.primary" }}>
                  +€{displayFigure(footer.amount)}
                </Money>{" "}
                left this month after spending and setting aside
              </>
            )}
            {footer.kind === "over" && (
              <>
                <Money sx={{ color: "error.main" }}>
                  -€{displayFigure(footer.amount)}
                </Money>{" "}
                this month: you spent and set aside more than came in
              </>
            )}
            {footer.kind === "no-income" && (
              <>
                Nothing came in yet ·{" "}
                <Money sx={{ color: "text.primary" }}>
                  €{displayFigure(footer.amount)}
                </Money>{" "}
                spent so far
              </>
            )}
          </Typography>
        </>
      )}
    </Box>
  );
}
