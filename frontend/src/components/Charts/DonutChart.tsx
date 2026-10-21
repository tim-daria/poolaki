/** @file Donut chart on @mui/x-charts. Slices are drawn at lifted shares so a tiny category stays visible; tooltips and the centre report the real figures. */

import {
  Box,
  Typography,
  useTheme,
  type SxProps,
  type Theme,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { chartsTooltipClasses } from "@mui/x-charts/ChartsTooltip";
import { donutShares } from "../../lib/overview";
import { Money } from "../Money";

export interface DonutSlice {
  id: string | number;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  /** Figure and caption in the hole. */
  center?: { value: string; label: string };
  /** Accessible name stating the figures; the drawing itself is hidden from assistive tech. */
  description: string;
  /**
   * False removes tooltips, highlighting and pointer events. Required inside
   * a link or button card, which must stay the surface's only control.
   */
  interactive?: boolean;
  /** Tooltip text for a slice's real value. */
  formatValue?: (value: number) => string;
  /** Size and placement. The wrapper is a size container, so both dimensions must resolve. */
  sx?: SxProps<Theme>;
}

/** Hole radius as a share of the ring, the proportion of the Overview ring. */
const INNER_RADIUS = "74%";
const PADDING_ANGLE = 2;
const CORNER_RADIUS = 4;
const EMPTY_ID = "empty";

export function DonutChart({
  slices,
  center,
  description,
  interactive = true,
  formatValue = String,
  sx,
}: DonutChartProps) {
  const theme = useTheme();
  const drawn = slices.filter((s) => s.value > 0);
  const empty = drawn.length === 0;
  const shares = donutShares(drawn.map((s) => s.value));
  const byId = new Map(drawn.map((s) => [s.id, s]));

  const data = empty
    ? [
        {
          id: EMPTY_ID,
          value: 1,
          label: "",
          color: "var(--mui-palette-divider)",
        },
      ]
    : drawn.map((s, i) => ({
        id: s.id,
        value: shares[i],
        label: s.label,
        color: s.color,
      }));

  return (
    <Box
      role="img"
      aria-label={description}
      sx={[
        {
          position: "relative",
          containerType: "size",
          pointerEvents: interactive ? "auto" : "none",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box aria-hidden sx={{ position: "absolute", inset: 0 }}>
        <PieChart
          hideLegend
          skipAnimation={!interactive}
          sx={{
            // Amounts carry the app's mono face, as the Money component does.
            [`& .${chartsTooltipClasses.valueCell}`]: {
              fontFamily: theme.typography.mono.fontFamily,
            },
          }}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          slotProps={{
            tooltip: { trigger: interactive && !empty ? "item" : "none" },
          }}
          series={[
            {
              data,
              innerRadius: INNER_RADIUS,
              outerRadius: "100%",
              paddingAngle: drawn.length > 1 ? PADDING_ANGLE : 0,
              cornerRadius: CORNER_RADIUS,
              highlightScope: interactive
                ? { fade: "global", highlight: "item" }
                : undefined,
              valueFormatter: (item) => {
                const real =
                  item.id === undefined ? undefined : byId.get(item.id);
                return real ? formatValue(real.value) : "";
              },
            },
          ]}
        />
      </Box>
      {center && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {/* Sized by the ring so a long total stays inside the hole. */}
          <Money
            sx={{
              fontWeight: 600,
              lineHeight: 1.2,
              fontSize: "clamp(0.7rem, 11cqw, 1.25rem)",
              color: empty ? "text.disabled" : "text.primary",
            }}
          >
            {center.value}
          </Money>
          <Typography
            component="span"
            sx={{
              fontSize: "clamp(0.6rem, 6.5cqw, 0.8rem)",
              color: "text.secondary",
              lineHeight: 1.2,
            }}
          >
            {center.label}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
