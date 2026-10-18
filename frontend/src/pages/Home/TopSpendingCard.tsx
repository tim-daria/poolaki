/** @file Top spending card: this month's expenses as a donut of the top three categories plus Other. */

import {
  Box,
  Stack,
  Typography,
  useTheme,
  type SxProps,
  type Theme,
} from "@mui/material";
import { Money } from "../../components/Money";
import { displayFigure, displayWhole } from "../../lib/money";
import {
  donutShares,
  shareLabel,
  type SpendingSlice,
} from "../../lib/overview";
import { HomeCard, HomeCardAction, HomeCardProblem } from "./HomeCard";
import { TABLET } from "../../lib/layout";
import { REPORT_UNAVAILABLE } from "../../lib/reports";

interface Props {
  /** Null when the report did not load; the card then says so. */
  slices: SpendingSlice[] | null;
  /** Placement in the page grid. */
  sx?: SxProps<Theme>;
}

/** The ring is this size everywhere; the legend takes what is left. */
const SIZE = 112;
/** In viewBox units of 100; the stroke is ~13% of the box. */
const STROKE = 13;
const RADIUS = 50 - STROKE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Gap between segments, as a share of the ring; only with two or more. */
const GAP = 0.02;

/** Below this much content width the ring stacks over the legend. */
const STACKED = "@container spending-card (max-width: 259px)";

/** Room for the centre figure inside the hole, in viewBox units. */
const HOLE_WIDTH = 66;
/** Width of one glyph in the mono font, as a fraction of the font size. */
const GLYPH_EM = 0.62;
const FIGURE_MAX_SIZE = 14;

/** The largest size at which `text` fits the hole, capped so short figures keep the usual size. */
function figureFontSize(text: string): number {
  return Math.min(FIGURE_MAX_SIZE, HOLE_WIDTH / (text.length * GLYPH_EM));
}

export function TopSpendingCard({ slices, sx }: Props) {
  const theme = useTheme();
  const colors = theme.palette.chart;

  if (slices === null) {
    return (
      <HomeCard
        title="Top spending"
        sx={[{ [TABLET]: { flex: 1 } }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        <HomeCardProblem>{REPORT_UNAVAILABLE}</HomeCardProblem>
      </HomeCard>
    );
  }

  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const empty = total === 0;
  const shares = donutShares(slices.map((s) => s.amount));
  const gap = slices.length >= 2 ? GAP : 0;

  // Other is always the lightest; the rest darken by rank.
  const color = (slice: SpendingSlice, i: number) =>
    slice.label === "Other" ? colors[colors.length - 1] : colors[i];

  let offset = 0;
  const segments = slices.map((s, i) => {
    const length = Math.max(0, shares[i] - gap) * CIRCUMFERENCE;
    const start = (offset + gap / 2) * CIRCUMFERENCE;
    offset += shares[i];
    return { key: s.label, color: color(s, i), length, start };
  });

  const centre = `€${displayFigure(total)}`;
  const centreSize = figureFontSize(centre);

  const description = empty
    ? "No spending this month"
    : `Top spending: ${slices
        .map((s) =>
          slices.length === 1
            ? `${s.label} €${displayWhole(s.amount)}`
            : `${s.label} ${shareLabel(s)}`,
        )
        .join(", ")}`;

  return (
    <HomeCard
      title="Top spending"
      to={empty ? undefined : "reports"}
      action={!empty && <HomeCardAction>See all</HomeCardAction>}
      sx={[
        {
          containerType: "inline-size",
          containerName: "spending-card",
          // Beside a taller card it grows to match; the ring and legend stay
          // centred in the extra room.
          [TABLET]: { flex: 1 },
        },
        // The caller places the card in the page grid.
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {/* Ring beside legend; a narrow card stacks them. `gap`, not Stack
          spacing, since spacing is a margin on one axis. */}
      <Stack
        sx={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          [TABLET]: { flex: 1 },
          [STACKED]: { flexDirection: "column", gap: 2.5 },
        }}
      >
        <Box
          role="img"
          aria-label={description}
          sx={{ flexShrink: 0, width: SIZE, height: SIZE }}
        >
          {/* The centre figure is SVG text, sized by its length so a long
              total stays inside the hole. */}
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            {/* Rotated so the first segment starts at 12 o'clock. */}
            <g transform="rotate(-90 50 50)">
              {empty ? (
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke="var(--mui-palette-divider)"
                  strokeWidth={STROKE}
                />
              ) : (
                segments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={seg.length > 0 ? STROKE : 0}
                    strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
                    strokeDashoffset={-seg.start}
                  />
                ))
              )}
            </g>
            <text
              x="50"
              y="48"
              textAnchor="middle"
              fontSize={centreSize}
              fontWeight="600"
              fontFamily={theme.typography.mono.fontFamily}
              fill={
                empty
                  ? "var(--mui-palette-text-disabled)"
                  : "var(--mui-palette-text-primary)"
              }
            >
              {centre}
            </text>
            <text
              x="50"
              y="60"
              textAnchor="middle"
              fontSize={centreSize * 0.55}
              fill="var(--mui-palette-text-secondary)"
            >
              spent
            </text>
          </svg>
        </Box>

        {empty ? (
          <Typography sx={{ color: "text.secondary" }}>
            No spending yet. Categories appear here as you add expenses.
          </Typography>
        ) : (
          <Stack
            component="ul"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              gap: 1,
              flex: 1,
              minWidth: 0,
              alignSelf: "stretch",
              justifyContent: "center",
            }}
          >
            {slices.map((s, i) => (
              <Stack
                component="li"
                key={s.label}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center" }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 0.75,
                    flexShrink: 0,
                    bgcolor: color(s, i),
                  }}
                />
                {/* Smaller than body text: the ring is the card's subject. */}
                <Typography
                  noWrap
                  sx={{ flex: 1, minWidth: 0, fontSize: "0.875rem" }}
                >
                  {s.label}
                </Typography>
                <Money sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  {slices.length === 1
                    ? `€${displayFigure(s.amount)}`
                    : shareLabel(s)}
                </Money>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </HomeCard>
  );
}
