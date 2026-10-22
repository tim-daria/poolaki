/** @file By month card: income and expense columns per month, or what was set aside each month. */

import { useState } from "react";
import { alpha, useTheme, type SxProps, type Theme } from "@mui/material";
import type { YearlyReportResponse } from "../../lib/reports";
import { displayFigure, displayWhole, parseMoney } from "../../lib/money";
import { monthOpacity } from "../../lib/chartScale";
import { TitledCard } from "../../components/Card/Card";
import { Segmented } from "../../components/Segmented/Segmented";
import {
  ColumnChart,
  type ColumnSeries,
} from "../../components/Charts/ColumnChart";
import { ChartLegend } from "../../components/Charts/ChartLegend";

type MonthView = "flow" | "savings";

interface MonthlyChartProps {
  monthly: YearlyReportResponse["monthly"];
  year: number;
  /** Index 0 is January. Null when the transfer rows did not load. */
  savingsByMonth: number[] | null;
  sx?: SxProps<Theme>;
}

/** Bars sit behind the gridlines and labels, so they carry half weight. */
const BAR_OPACITY = 0.5;

const euros = (n: number) => `€${displayWhole(n)}`;
/** Axis ticks and bar labels: compact past six digits, so a large figure still fits. */
const shortEuros = (n: number) => `€${displayFigure(n)}`;

export function MonthlyChart({
  monthly,
  year,
  savingsByMonth,
  sx,
}: MonthlyChartProps) {
  const { palette } = useTheme();
  // The Overview's colours for these same three figures, softened to half.
  // Applied to the fill rather than as an opacity attribute, which the bar
  // slot ignores. Resolved values: theme paths do not resolve inside the SVG.
  const INCOME_COLOR = alpha(palette.success.main, BAR_OPACITY);
  const EXPENSE_COLOR = alpha(palette.error.main, BAR_OPACITY);
  const SAVINGS_COLOR = alpha(palette.accent.main, BAR_OPACITY);

  const [view, setView] = useState<MonthView>("flow");
  const savings = savingsByMonth !== null && view === "savings";

  // Null for past years, where every month is complete.
  const now = new Date();
  const currentMonth = year === now.getFullYear() ? now.getMonth() + 1 : null;
  const labels = monthly.map((m) =>
    // English, like the rest of the interface. The money locale sets number
    // separators, not the language.
    new Date(year, m.month - 1).toLocaleString("en", { month: "short" }),
  );
  // A month that has not happened yet draws no bar at all.
  const elapsed = monthly.map((m) => monthOpacity(m.month, currentMonth) > 0);
  const valueAt = (index: number, value: number) =>
    elapsed[index] ? value : null;

  const series: ColumnSeries[] = savings
    ? [
        {
          id: "savings",
          label: "Saved per month",
          color: SAVINGS_COLOR,
          data: monthly.map((m, i) =>
            valueAt(i, savingsByMonth[m.month - 1] ?? 0),
          ),
        },
      ]
    : [
        {
          id: "income",
          label: "Income",
          color: INCOME_COLOR,
          data: monthly.map((m, i) => valueAt(i, parseMoney(m.income))),
        },
        {
          id: "expense",
          label: "Expenses",
          color: EXPENSE_COLOR,
          data: monthly.map((m, i) => valueAt(i, parseMoney(m.expense))),
        },
      ];

  // Averaged over the months already elapsed, so a half-finished year is not
  // dragged down by months that have not happened.
  const savedSoFar = savings
    ? monthly
        .filter((_, i) => elapsed[i])
        .map((m) => savingsByMonth[m.month - 1] ?? 0)
    : [];
  const average =
    savedSoFar.length > 0
      ? savedSoFar.reduce((sum, n) => sum + n, 0) / savedSoFar.length
      : null;

  const describe = (index: number) =>
    series.map((s) => `${s.label} ${euros(s.data[index] ?? 0)}`).join(", ");
  const description = `${savings ? "Saved" : "Income and expenses"} per month in ${year}: ${labels
    .map((label, i) => (elapsed[i] ? `${label} ${describe(i)}` : null))
    .filter(Boolean)
    .join("; ")}`;

  return (
    <TitledCard
      title="By month"
      subtitle={
        savings
          ? "What was set aside each month"
          : "Income and expenses per month"
      }
      action={
        savingsByMonth !== null && (
          <Segmented<MonthView>
            aria-label="Monthly view"
            value={view}
            onChange={setView}
            options={[
              { value: "flow", label: "Income & expenses" },
              { value: "savings", label: "Savings" },
            ]}
          />
        )
      }
      sx={sx}
    >
      <ColumnChart
        labels={labels}
        series={series}
        formatValue={shortEuros}
        formatTooltipValue={euros}
        description={description}
        focusIndex={currentMonth === null ? undefined : currentMonth - 1}
        referenceLine={
          average === null
            ? undefined
            : { value: average, label: `avg ${shortEuros(average)}` }
        }
      />
      <ChartLegend
        items={series.map((s) => ({ label: s.label, color: s.color }))}
      />
    </TitledCard>
  );
}
