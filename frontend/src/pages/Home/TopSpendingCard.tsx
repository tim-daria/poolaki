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
import { DonutChart } from "../../components/Charts/DonutChart";
import { displayFigure, displayWhole } from "../../lib/money";
import { shareLabel, type SpendingSlice } from "../../lib/overview";
import {
  TitledCard,
  CardAction,
  CardProblem,
} from "../../components/Card/Card";
import { DESKTOP, TABLET } from "../../lib/layout";
import { REPORT_UNAVAILABLE } from "../../lib/reports";

interface Props {
  /** Null when the report did not load; the card then says so. */
  slices: SpendingSlice[] | null;
  /**
   * Placement in the page grid. On desktop the ring has no size of its own:
   * the caller must give the card a definite height (Home's `1fr` grid row),
   * or the ring collapses.
   */
  sx?: SxProps<Theme>;
}

/** Ring size below desktop; on desktop it fills the row it is given. */
const SIZE = 112;

/** Below this much content width the ring stacks over the legend. */
const STACKED = "@container spending-card (max-width: 259px)";

const ringSx = {
  flexShrink: 0,
  width: SIZE,
  height: SIZE,
  // Fills the row's height; the size container keeps the ring out of the row's
  // intrinsic height, so the sidebar never outgrows the card beside it. A
  // percentage, not `alignSelf: stretch`: WebKit does not resolve aspect-ratio
  // from a stretched flex cross size and leaves the item 0 wide.
  [DESKTOP]: {
    width: "auto",
    height: "100%",
    aspectRatio: "1 / 1",
  },
} as const;

export function TopSpendingCard({ slices, sx }: Props) {
  const theme = useTheme();
  const colors = theme.palette.chart;

  if (slices === null) {
    return (
      <TitledCard
        title="Top spending"
        sx={[{ [TABLET]: { flex: 1 } }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        <CardProblem>{REPORT_UNAVAILABLE}</CardProblem>
      </TitledCard>
    );
  }

  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const empty = total === 0;

  // Other is always the lightest; the rest darken by rank.
  const color = (slice: SpendingSlice, i: number) =>
    slice.label === "Other" ? colors[colors.length - 1] : colors[i];

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
    <TitledCard
      title="Top spending"
      to={empty ? undefined : "reports"}
      action={!empty && <CardAction>See all</CardAction>}
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
        {/* Non-interactive: the card is the link, and a tooltip inside it
            would be a second control on one surface. */}
        <DonutChart
          interactive={false}
          slices={slices.map((s, i) => ({
            id: s.label,
            label: s.label,
            value: s.amount,
            color: color(s, i),
          }))}
          center={{ value: `€${displayFigure(total)}`, label: "spent" }}
          description={description}
          sx={ringSx}
        />

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
    </TitledCard>
  );
}
