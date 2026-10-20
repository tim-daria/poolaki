/** @file Grouped column chart on @mui/x-charts: one band per column, with tooltips, a hover band and an optional dashed reference line. */

import { useEffect, useRef } from "react";
import { Box, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import { chartsTooltipClasses } from "@mui/x-charts/ChartsTooltip";
import { niceMax } from "../../lib/chartScale";
import { PRINT } from "../../lib/layout";

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
  /** When the plot scrolls, it opens with this column as the last one in view. */
  focusIndex?: number;
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
  focusIndex,
}: ColumnChartProps) {
  const theme = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = labels.length;

  // Re-runs only when the focus moves (a year change), never on data or
  // size changes, so the plot is not yanked from wherever the user scrolled.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || focusIndex === undefined || el.scrollWidth <= el.clientWidth)
      return;
    const columnWidth = (el.scrollWidth - AXIS_WIDTH) / columns;
    el.scrollLeft = Math.max(
      0,
      AXIS_WIDTH + (focusIndex + 1) * columnWidth - el.clientWidth,
    );
  }, [focusIndex, columns]);
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
      <Box
        ref={scrollRef}
        sx={{
          overflowX: "auto",
          overflowY: "hidden",
          [PRINT]: { overflow: "visible" },
        }}
      >
        <Box
          sx={{
            minWidth: AXIS_WIDTH + columns * MIN_COLUMN_WIDTH,
            [PRINT]: { minWidth: 0 },
          }}
        >
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
