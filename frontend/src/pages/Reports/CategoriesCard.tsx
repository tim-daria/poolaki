/** @file Categories card: the year's expenses, income or savings split into shares, as a donut beside a list. */

import { useState } from "react";
import { Box } from "@mui/material";
import type { CategoryReport } from "../../lib/reports";
import type { GoalSavings } from "../../lib/savings";
import { displayAmount, displayFigure, parseMoney } from "../../lib/money";
import { TABLET } from "../../lib/layout";
import { useChartColors } from "../../hooks/useChartColors";
import { TitledCard } from "../../components/Card/Card";
import { Segmented } from "../../components/Segmented/Segmented";
import { DonutChart } from "../../components/Charts/DonutChart";
import { ShareList, type ShareRow } from "../../components/Charts/ShareList";

type View = "expense" | "income" | "savings";

interface CategoriesCardProps {
  categories: CategoryReport[];
  /** Null when the transfer rows did not load; the Savings view is then absent. */
  savingsByGoal: GoalSavings[] | null;
  year: number;
}

const DONUT_SIZE = 200;
/** The list stops widening past this, so the body stays a centred block. */
const LIST_MAX_WIDTH = 820;
const NOUN: Record<View, string> = {
  expense: "expenses",
  income: "income",
  savings: "savings",
};
/** Under the figure in the ring: what the total is, in one word. */
const CENTRE_CAPTION: Record<View, string> = {
  expense: "spent",
  income: "received",
  savings: "saved",
};
const EMPTY_TEXT = "No data available for this view.";

const euros = (n: number) => `€${displayAmount(n)}`;
/** Rows and the ring centre: compact past six digits, so a large figure keeps its column. */
const shortEuros = (n: number) => `€${displayFigure(n)}`;

export function CategoriesCard({
  categories,
  savingsByGoal,
  year,
}: CategoriesCardProps) {
  const chartColors = useChartColors();
  const [view, setView] = useState<View>("expense");

  // Goals and categories are both just named totals here.
  const totals =
    view === "savings"
      ? (savingsByGoal ?? []).map((g) => ({
          id: `goal-${g.id}`,
          label: g.name,
          value: g.total,
        }))
      : categories
          .filter((c) => c.type === view)
          .map((c) => ({
            id: c.category_id,
            label: c.name,
            value: parseMoney(c.total),
          }));

  // The Overview's chart palette, shared by the donut slice and its list row.
  const colors = chartColors.series(totals.length);
  const rows: ShareRow[] = totals.map((row, i) => ({
    ...row,
    color: colors[i],
  }));
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  // Savings name the goals in the heading, so they need no second line.
  const title = view === "savings" ? `Saved per goal in ${year}` : "Categories";
  const subtitle =
    view === "savings" ? undefined : `Total ${NOUN[view]} in ${year}`;

  const description =
    rows.length === 0
      ? `No ${NOUN[view]} in ${year}`
      : `${NOUN[view]} in ${year}: ${rows
          .map((r) => `${r.label} ${euros(r.value)}`)
          .join(", ")}`;

  const options = [
    { value: "expense" as const, label: "Expenses" },
    { value: "income" as const, label: "Income" },
    ...(savingsByGoal === null
      ? []
      : [{ value: "savings" as const, label: "Savings" }]),
  ];

  return (
    <TitledCard
      title={title}
      subtitle={subtitle}
      action={
        <Segmented<View>
          aria-label="Category view"
          value={view}
          onChange={setView}
          options={options}
        />
      }
    >
      <Box
        sx={{
          display: "grid",
          gap: 4,
          alignItems: "center",
          gridTemplateColumns: "minmax(0, 1fr)",
          // Ring on the left of one block, the list beside it. The block is
          // centred, so whatever room is left over splits evenly either side.
          justifyContent: "center",
          [TABLET]: {
            gap: 5,
            gridTemplateColumns: `${DONUT_SIZE}px minmax(0, ${LIST_MAX_WIDTH}px)`,
          },
        }}
      >
        <DonutChart
          slices={rows}
          center={{ value: shortEuros(total), label: CENTRE_CAPTION[view] }}
          description={description}
          formatValue={euros}
          sx={{ width: DONUT_SIZE, height: DONUT_SIZE, justifySelf: "center" }}
        />
        <ShareList
          rows={rows}
          formatValue={shortEuros}
          formatExact={euros}
          emptyText={EMPTY_TEXT}
        />
      </Box>
    </TitledCard>
  );
}
