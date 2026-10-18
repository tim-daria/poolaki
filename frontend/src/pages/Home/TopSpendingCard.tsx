/** @file Top spending card: this month's expenses as a donut of the top three categories plus Other. */

import { Box, Stack, Typography, useTheme } from "@mui/material";
import { Money } from "../../components/Money";
import { displayFigure, displayWhole } from "../../lib/money";
import {
  donutShares,
  shareLabel,
  type SpendingSlice,
} from "../../lib/overview";
import { HomeCard, HomeCardAction } from "./HomeCard";
import { DESKTOP } from "./layout";

interface Props {
  slices: SpendingSlice[];
}

/**
 * The ring's size on phones, and its ceiling on desktop. There the card is
 * held to the row's height, so the ring takes whatever the legend leaves and
 * shrinks as the legend grows.
 */
const SIZE = 200;
/** In viewBox units of 100; the stroke is ~13% of the box. */
const STROKE = 13;
const RADIUS = 50 - STROKE / 2;
/** A half ring: the segments share the top 180 degrees, left to right. */
const ARC = Math.PI * RADIUS;
const CIRCUMFERENCE = 2 * ARC;
/** The box holds the arc and its stroke, nothing below the centre line. */
const VIEW = { width: 100, height: 50 + STROKE / 2 + 1 };
/** Gap between segments, as a share of the ring; only with two or more. */
const GAP = 0.02;

/** Room for the centre figure inside the hole, in viewBox units, at the height it sits. */
const HOLE_WIDTH = 64;
/** Width of one glyph in the mono font, as a fraction of the font size. */
const GLYPH_EM = 0.62;
const FIGURE_MAX_SIZE = 12;

/** The largest size at which `text` fits the hole, capped so short figures keep the usual size. */
function figureFontSize(text: string): number {
  return Math.min(FIGURE_MAX_SIZE, HOLE_WIDTH / (text.length * GLYPH_EM));
}

/** A card wider than this lays the arc beside the legend instead of above it. */
const WIDE_CARD = "@container spending-card (min-width: 461px)";

export function TopSpendingCard({ slices }: Props) {
  const theme = useTheme();
  const colors = theme.palette.chart;
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const empty = total === 0;
  const shares = donutShares(slices.map((s) => s.amount));
  const gap = slices.length >= 2 ? GAP : 0;

  // Other is always the lightest; the rest darken by rank.
  const color = (slice: SpendingSlice, i: number) =>
    slice.label === "Other" ? colors[colors.length - 1] : colors[i];

  let offset = 0;
  const segments = slices.map((s, i) => {
    const length = Math.max(0, shares[i] - gap) * ARC;
    const start = (offset + gap / 2) * ARC;
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
      sx={{
        containerType: "inline-size",
        containerName: "spending-card",
        [DESKTOP]: { flex: 1, minHeight: 0 },
      }}
    >
      {/* Arc over legend. On desktop the arc is the flexible part: it takes
          the height the legend leaves, and its width follows. In a wide
          card the arc sits beside the legend at its full size instead. */}
      {/* `gap`, not Stack spacing: spacing is a margin on the column axis and
          would stay when the container query turns this into a row. */}
      <Stack
        sx={{
          alignItems: "center",
          gap: 2.5,
          [DESKTOP]: { flex: 1, minHeight: 0 },
          [WIDE_CARD]: { flexDirection: "row", gap: 8 },
        }}
      >
        <Box
          role="img"
          aria-label={description}
          sx={{
            flexShrink: 0,
            width: SIZE,
            aspectRatio: `${VIEW.width} / ${VIEW.height}`,
            // Stacked on desktop: the arc takes at least 40% of the card's
            // height, more when the legend needs less, and its width follows.
            [DESKTOP]: {
              flex: "1 1 40%",
              minHeight: 0,
              width: "auto",
              height: "auto",
              maxWidth: "100%",
            },
            // Side by side: the arc takes 40% of the card's width instead.
            [WIDE_CARD]: {
              flex: "0 0 40%",
              width: "auto",
              maxWidth: "none",
              height: "auto",
            },
          }}
        >
          {/* The centre figure is SVG text, so it scales with the ring. */}
          <svg
            viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
            width="100%"
            height="100%"
          >
            {/* Rotated so the arc runs from 9 o'clock over the top to 3. */}
            <g transform="rotate(180 50 50)">
              {empty ? (
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke="var(--mui-palette-divider)"
                  strokeWidth={STROKE}
                  strokeDasharray={`${ARC} ${ARC}`}
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
            {/* Sized by length so a long figure stays inside the arc. */}
            <text
              x="50"
              y="40"
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
              y="51"
              textAnchor="middle"
              fontSize={centreSize * 0.625}
              fill="var(--mui-palette-text-secondary)"
            >
              spent
            </text>
          </svg>
        </Box>

        {empty ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center" }}>
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
              alignSelf: "stretch",
              // A size container, so the rows can size their text to the
              // height the arc leaves them.
              // Its natural height (rows at 1rem plus gaps), capped at 60% of
              // the card; past the cap the rows' text shrinks to fit.
              [DESKTOP]: {
                flex: "0 1 auto",
                height: `min(${slices.length * 24 + (slices.length - 1) * 8}px, 60%)`,
                containerType: "size",
                containerName: "legend",
              },
              [WIDE_CARD]: { flex: "1 1 0", minWidth: 0, alignSelf: "center" },
            }}
          >
            {slices.map((s, i) => (
              <Stack
                component="li"
                key={s.label}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                  // The rows at 1.5 line height plus their 8px gaps must fit the
                  // legend's height; the text shrinks from 1rem to do so.
                  [DESKTOP]: {
                    fontSize: `min(1rem, calc((100cqh - ${(slices.length - 1) * 8}px) / ${slices.length * 1.5}))`,
                  },
                  // Beside the arc the rows grow to span its height: the arc is
                  // 40% of the card wide and 0.575 as tall as it is wide, so
                  // its height is 23cqw of the card. Capped at the card title's
                  // size so the legend never outweighs it.
                  [WIDE_CARD]: {
                    fontSize: `clamp(1rem, calc((23cqw - ${(slices.length - 1) * 8}px) / ${slices.length * 1.5}), 1.15rem)`,
                  },
                }}
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
                <Typography
                  noWrap
                  sx={{ flex: 1, minWidth: 0, fontSize: "inherit" }}
                >
                  {s.label}
                </Typography>
                <Money sx={{ fontSize: "0.9em", color: "text.secondary" }}>
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
