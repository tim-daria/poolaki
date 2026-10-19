/**
 * @file Month half of the top card: came in, spent and to savings as three
 * signed columns on one baseline, a hover-only note on what they mean, and a
 * footer with the month's net.
 */

import { Box, Stack, Tooltip, Typography, type Theme } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Money } from "../../components/Money";
import { displayAmount, displayFigure } from "../../lib/money";
import { monthFooter, type MonthSummary } from "../../lib/overview";
import { HomeCardAction, HomeCardProblem } from "./HomeCard";
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
  /**
   * Id of the hidden explanation, for the card link's `aria-describedby`.
   * The card is one link, so the info icon itself is not a control.
   */
  descriptionId: string;
}

/** Tallest column, per the spec: 64px on phones, 72px from desktop. */
const MAX_HEIGHT = { xs: 64, desktop: 72 };
/** A non-zero value never draws shorter than this; zero is a stub. */
const MIN_HEIGHT = 4;
const STUB_HEIGHT = 3;
/** Bar corners, in theme radius units: the same 1.5 the other rounded fills use. */
const BAR_RADIUS = 1.5;
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
  return `Everything that came in, was spent or was moved to savings since 1 ${month}. Your net balance changes by: came in – spent – to savings.`;
}

// Pastel columns, full-colour labels: the main colours at 30% for money in
// and out, the lavender tint for savings. The sign says which way the money
// moved; savings carry none, since they are set aside rather than gone.
const COLUMNS = [
  {
    key: "income",
    label: "Came in",
    sign: "+",
    bar: "success.main",
    barOpacity: 0.3,
    text: "success.main",
  },
  {
    key: "expenses",
    label: "Spent",
    sign: "-",
    bar: "error.light",
    barOpacity: 1,
    text: "error.main",
  },
  {
    key: "saved",
    label: "To savings",
    sign: "",
    bar: "primary.light",
    barOpacity: 1,
    text: "accent.main",
  },
] as const;

const GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  columnGap: 2,
  textAlign: "center",
} as const;

// Visually hidden but read by assistive tech. Pixel strings on purpose: a
// bare 1 is 100% in sx, which stretched the span past the page edge.
const VISUALLY_HIDDEN = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;

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
  // Savings net of withdrawals can go below zero; the sign then comes from
  // the value, not the column.
  const shownSign = value > 0 ? sign : value < 0 ? "-" : "";
  const magnitude = Math.abs(value);

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
      <Money
        title={`${shownSign}€${displayAmount(magnitude)}`}
        sx={{
          fontSize: FIGURE_SIZE,
          mb: FIGURE_GAP,
          whiteSpace: "nowrap",
          color: value > 0 ? text : "text.disabled",
        }}
      >
        {shownSign}€{displayFigure(magnitude)}
      </Money>
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

export function MonthlySummaryCard({
  summary,
  month,
  year,
  scaleMax,
  descriptionId,
}: Props) {
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
          {/* Hover only: the card is a link, so the icon cannot be focusable
              or tappable on its own. The text reaches assistive tech through
              the hidden span the card link is described by. */}
          <Tooltip title={info} arrow disableFocusListener disableTouchListener>
            <Box
              component="span"
              aria-hidden
              sx={{
                display: "inline-flex",
                color: "text.secondary",
                cursor: "help",
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: "1rem" }} />
            </Box>
          </Tooltip>
          <Box component="span" id={descriptionId} sx={VISUALLY_HIDDEN}>
            {info}
          </Box>
        </Stack>
        {!empty && <HomeCardAction>{year} report</HomeCardAction>}
      </Stack>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Money in and out
      </Typography>

      {!footer && <HomeCardProblem>{REPORT_UNAVAILABLE}</HomeCardProblem>}

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
