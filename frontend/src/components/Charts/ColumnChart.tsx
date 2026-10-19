/** @file Grouped column chart on @mui/x-charts: one band per column, with tooltips, a hover band and an optional dashed reference line. */

import { Box, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import { chartsTooltipClasses } from "@mui/x-charts/ChartsTooltip";
import { niceMax } from "../../lib/chartScale";

export interface ColumnSeries {
  id: string;
  label: string;
  /** A CSS colour; theme paths do not resolve inside the chart's SVG. */
  color: string;
  /** One entry per column. Null draws no bar, for a month that has not happened. */
  data: (number | null)[];
}

export interface ReferenceLine {
  value: number;
  label: string;
}

interface ColumnChartProps {
  /** The band labels, one per column. */
  labels: string[];
  series: ColumnSeries[];
  formatValue: (value: number) => string;
  /** Accessible name stating the figures; the bars themselves carry no text. */
  description: string;
  referenceLine?: ReferenceLine;
  height?: number;
}

const AXIS_WIDTH = 72;
/** Below this a column's bars and label stop being readable, so the plot scrolls. */
const MIN_COLUMN_WIDTH = 44;
const TICK_COUNT = 3;
const BAR_RADIUS = 6;

export function ColumnChart({
  labels,
  series,
  formatValue,
  description,
  referenceLine,
  height = 240,
}: ColumnChartProps) {
  const theme = useTheme();
  // Amounts carry the app's mono face, as the Money component does.
  const monoFamily = theme.typography.mono.fontFamily;
  // A fixed maximum keeps the three ticks round and the columns comparable
  // between views.
  const axisMax = niceMax(
    Math.max(
      0,
      referenceLine?.value ?? 0,
      ...series.flatMap((s) => s.data.map((v) => v ?? 0)),
    ),
  );

  return (
    <Box role="img" aria-label={description}>
      {/* Narrow screens scroll the plot rather than shrink the columns to hairlines. */}
      <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
        <Box sx={{ minWidth: AXIS_WIDTH + labels.length * MIN_COLUMN_WIDTH }}>
          <BarChart
            height={height}
            hideLegend
            borderRadius={BAR_RADIUS}
            grid={{ horizontal: true }}
            sx={{
              [`& .${chartsTooltipClasses.valueCell}`]: {
                fontFamily: monoFamily,
              },
            }}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            xAxis={[
              {
                scaleType: "band",
                data: labels,
                disableLine: true,
                disableTicks: true,
              },
            ]}
            yAxis={[
              {
                width: AXIS_WIDTH,
                min: 0,
                max: axisMax,
                tickNumber: TICK_COUNT,
                disableLine: true,
                disableTicks: true,
                tickLabelStyle: { fontFamily: monoFamily },
                valueFormatter: (value: number) =>
                  value === 0 ? "0" : formatValue(value),
              },
            ]}
            series={series.map((s) => ({
              id: s.id,
              label: s.label,
              color: s.color,
              data: s.data,
              valueFormatter: (value: number | null) =>
                value === null ? "" : formatValue(value),
            }))}
          >
            {referenceLine && (
              <ChartsReferenceLine
                y={referenceLine.value}
                label={referenceLine.label}
                labelAlign="end"
                lineStyle={{
                  strokeDasharray: "4 4",
                  stroke: "var(--mui-palette-text-secondary)",
                }}
                labelStyle={{
                  fill: "var(--mui-palette-text-secondary)",
                  fontSize: 12,
                  fontFamily: monoFamily,
                }}
              />
            )}
          </BarChart>
        </Box>
      </Box>
    </Box>
  );
}
