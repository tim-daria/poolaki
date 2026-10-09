import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  type SelectChangeEvent,
  CircularProgress,
  Stack,
  LinearProgress,
  ToggleButton, // CHANGED: segmented tabs replace the ButtonGroup
  ToggleButtonGroup,
  Typography,
  GlobalStyles,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { PieChart } from "@mui/x-charts/PieChart";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useChartColors } from "../../hooks/useChartColors";
import { fetchYearlyReport, type YearlyReportResponse } from "../../lib/reports";
import { Money } from "../../components/Money";
import { PageHeading, PageActionButton } from "../../components/PageHeader/PageHeader";

const cardSx = {
  borderRadius: 4,
  boxShadow: "none",
  border: "1px solid",
  borderColor: "divider",
  "@media print": { breakInside: "avoid" },
} as const;

// ---------------------------------------------------------------------------
// MOCKS. TODO: remove when the backend returns contributions and `Withdraw`.
// ---------------------------------------------------------------------------
const mockSavingsAmount = "9205.00";
// NEW: saved per month (index 0 = January)
const mockMonthlySavings = [1100, 1300, 900, 1500, 1000, 1200, 800, 1400, 1455, 0, 0, 0];
// NEW: savings by goal, used by the Categories tab "Savings"
const mockGoalSavings = [
  { id: "g1", name: "Emergency fund", total: 4200 },
  { id: "g2", name: "Trip to Barcelona", total: 2300 },
  { id: "g3", name: "New laptop", total: 1790 },
  { id: "g4", name: "Without a goal", total: 915 },
];

// NEW: rounds a value up to a "nice" axis maximum (1, 2, 5 x 10^n), so no max is hardcoded
function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

// NEW: pill-shaped segmented control shared by both cards
type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next: T | null) => next && onChange(next)} // ignore clicks on the active tab
      sx={{ "@media print": { display: "none" } }} // controls are useless on paper
    >
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value} sx={{ textTransform: "none", px: 1.5, py: 0.5 }}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

type SummaryCardProps = {
  label: string;
  amount: string;
  color: "success.main" | "error.main" | "primary.main";
};

function SummaryCard({ label, amount, color }: SummaryCardProps) {
  return (
    <Card sx={cardSx}>
      <CardContent>
        <Typography variant="body2" gutterBottom sx={{ color: "text.secondary" }}>
          {label}
        </Typography>
        {/* CHANGED: `mono` variant from the theme, as in the design */}
        <Typography variant="mono" sx={{ color, fontWeight: "bold", display: "block" }}>
          <Money>{amount}</Money>
        </Typography>
        {/* TODO: comparison line ("↑ 6% vs Jan-Sep 2025") needs previous-year totals from the backend */}
      </CardContent>
    </Card>
  );
}

type MonthView = "IncomeExpenses" | "Savings";
type CategoryFilter = "Expenses" | "Income" | "Savings";

export function Component() {
  const org = useCurrentOrg();
  const chartColors = useChartColors();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [reportData, setReportData] = useState<YearlyReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("Expenses");
  const [monthView, setMonthView] = useState<MonthView>("IncomeExpenses"); // NEW: tab of "By month"

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchYearlyReport(org.id, year, controller.signal);
        setReportData(data);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error(error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [org.id, year]);

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setYear(Number(event.target.value));
  };

  const formatMoney = (amount: string | number) => {
    const num = typeof amount === "number" ? amount : parseFloat(amount);
    return `€${num.toLocaleString("es-ES", { minimumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography sx={{ color: "error.main" }}>Error loading report data.</Typography>
      </Box>
    );
  }

  // -------------------------------------------------------------------------
  // By month
  // -------------------------------------------------------------------------
  // NEW: the highlighted month. Null for past years, where every month is "complete".
  const currentMonth = year === currentYear ? new Date().getMonth() + 1 : null;

  // NEW: current month = full color, past months = attenuated, future months = hidden
  const monthOpacity = (month: number) => {
    if (currentMonth === null || month === currentMonth) return 1;
    return month < currentMonth ? 0.35 : 0;
  };

  // NEW: one entry per month; the values depend on the active tab
  const monthBars = reportData.monthly.map((m) => ({
    month: m.month,
    values:
      monthView === "IncomeExpenses"
        ? [
            { value: parseFloat(m.income), color: "success.main" },
            { value: parseFloat(m.expense), color: "error.main" },
          ]
        : [{ value: mockMonthlySavings[m.month - 1] ?? 0, color: "accent.main" }],
  }));

  // NEW: axis maximum computed from the real data instead of a fixed 5000
  const axisMax = niceMax(Math.max(0, ...monthBars.flatMap((b) => b.values.map((v) => v.value))));
  const axisTicks = [axisMax, axisMax / 2, 0];

  // NEW: average line, only for the Savings tab and only over months already elapsed
  const elapsedBars = monthBars.filter((b) => monthOpacity(b.month) > 0);
  const savingsAverage =
    monthView === "Savings" && elapsedBars.length > 0
      ? elapsedBars.reduce((sum, b) => sum + b.values[0].value, 0) / elapsedBars.length
      : null;

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------
  // CHANGED: every view is normalized to the same row shape (real data or mock goals)
  const rows =
    categoryFilter === "Savings"
      ? mockGoalSavings.map((g) => ({ id: g.id, name: g.name, total: g.total }))
      : reportData.categories
          .filter((c) => c.type === (categoryFilter === "Expenses" ? "expense" : "income"))
          .map((c) => ({ id: c.category_id, name: c.name, total: parseFloat(c.total) }));

  const filterTotal = rows.reduce((sum, r) => sum + r.total, 0);

  // NEW: lavender shade per row, shared by the donut slice and its list row
  const colorFor = (index: number) => chartColors.shade(index, rows.length);

  const pieData = rows.map((r, i) => ({ id: r.id, value: r.total, label: r.name, color: colorFor(i) }));
  const chartData = pieData.length > 0 ? pieData : [{ id: "empty", value: 1, label: "", color: chartColors.empty }];

  // NEW: subtitle that changes with the tab
  const categoriesSubtitle =
    categoryFilter === "Savings"
      ? `Savings by goal in ${year} · ${formatMoney(filterTotal)}`
      : `Share of all ${categoryFilter.toLowerCase()} in ${year} · ${formatMoney(filterTotal)}`;

  return (
    <Box sx={{ p: 3, maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <GlobalStyles
        styles={{
          "@media print": {
            "@page": { margin: "12mm" },
            "*": { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" },
            ".MuiDrawer-root, .MuiAppBar-root": { display: "none !important" },
            main: { margin: "0 !important", padding: "0 !important", width: "100% !important" },
          },
        }}
      />

      {/* Print-only title: the real one lives in the header portal, which is hidden on paper */}
      <Box sx={{ display: "none", "@media print": { display: "block" }, mb: 2 }}>
        <Typography variant="h4" component="h1">
          Reports {year}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Income, expenses and savings for the year
        </Typography>
      </Box>

      <PageHeading>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h2" component="h1" sx={{ lineHeight: 1.2 }}>
            Reports
          </Typography>
          <Select
            value={year}
            onChange={handleYearChange}
            variant="standard"
            disableUnderline
            sx={{
              fontSize: "2.125rem",
              fontWeight: 500,
              color: "text.primary",
              "& .MuiSelect-select": { py: 0 },
            }}
          >
            <MenuItem value={2025}>2025</MenuItem>
            <MenuItem value={2026}>2026</MenuItem>
          </Select>
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          Income, expenses and savings for the year
        </Typography>
      </PageHeading>

      <PageActionButton
        startIcon={<PrintIcon />}
        variant="outlined"
        color="inherit"
        onClick={() => window.print()}
        sx={{ borderRadius: 8, borderColor: "divider", "@media print": { display: "none" } }}
      >
        Print
      </PageActionButton>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard label="Income" amount={formatMoney(reportData.totals.income)} color="success.main" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard label="Expenses" amount={formatMoney(reportData.totals.expense)} color="error.main" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard label="Set aside" amount={formatMoney(mockSavingsAmount)} color="primary.main" />
        </Grid>
      </Grid>

      {/* By month */}
      <Card sx={{ ...cardSx, mb: 4, p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            By month
          </Typography>
          {/* NEW: the tab now switches the chart */}
          <Segmented<MonthView>
            value={monthView}
            onChange={setMonthView}
            options={[
              { value: "IncomeExpenses", label: "Income & expenses" },
              { value: "Savings", label: "Savings" },
            ]}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          {/* NEW: Y axis labels (top, middle, zero) */}
          <Box sx={{ height: 200, display: "flex", flexDirection: "column", justifyContent: "space-between", width: 56 }}>
            {axisTicks.map((tick) => (
              <Typography key={tick} variant="caption" sx={{ color: "text.secondary", lineHeight: 1 }}>
                {tick === 0 ? "0" : formatMoney(tick)}
              </Typography>
            ))}
          </Box>

          <Box sx={{ flex: 1 }}>
            {/* Plot area */}
            <Box sx={{ position: "relative", height: 200 }}>
              {/* NEW: horizontal grid lines */}
              {[0, 50, 100].map((pos) => (
                <Box
                  key={pos}
                  sx={{ position: "absolute", left: 0, right: 0, top: `${pos}%`, borderTop: "1px solid", borderColor: "divider" }}
                />
              ))}

              {/* NEW: dashed average line (Savings tab only) */}
              {savingsAverage !== null && (
                <Box
                  sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: `${(savingsAverage / axisMax) * 100}%`,
                    borderTop: "1px dashed",
                    borderColor: "text.secondary",
                  }}
                >
                  <Typography variant="caption" sx={{ position: "absolute", right: 0, bottom: 2, color: "text.secondary" }}>
                    avg {formatMoney(Math.round(savingsAverage))}
                  </Typography>
                </Box>
              )}

              <Box sx={{ position: "relative", height: "100%", display: "flex", alignItems: "flex-end", gap: 2 }}>
                {monthBars.map((b) => {
                  const opacity = monthOpacity(b.month);
                  const isCurrent = b.month === currentMonth;
                  const tallest = Math.max(...b.values.map((v) => v.value));

                  return (
                    <Box
                      key={b.month}
                      sx={{
                        flex: 1,
                        height: "100%",
                        position: "relative",
                        display: "flex",
                        gap: 0.5,
                        alignItems: "flex-end",
                        justifyContent: "center",
                        opacity, // CHANGED: attenuates every month except the current one
                      }}
                    >
                      {/* NEW: value label above the highlighted month */}
                      {isCurrent && (
                        <Typography
                          variant="caption"
                          sx={{
                            position: "absolute",
                            bottom: `calc(${(tallest / axisMax) * 100}% + 4px)`,
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoney(tallest)}
                        </Typography>
                      )}
                      {b.values.map((v, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            width: 14,
                            height: `${Math.min((v.value / axisMax) * 100, 100)}%`,
                            bgcolor: v.color,
                            borderRadius: "4px 4px 0 0",
                          }}
                        />
                      ))}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* Month names, same gap as the bars so they line up */}
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              {monthBars.map((b) => (
                <Typography
                  key={b.month}
                  variant="caption"
                  sx={{
                    flex: 1,
                    textAlign: "center",
                    color: b.month === currentMonth ? "text.primary" : "text.secondary",
                    fontWeight: b.month === currentMonth ? "bold" : "normal",
                  }}
                >
                  {new Date(year, b.month - 1).toLocaleString("en", { month: "short" })}
                </Typography>
              ))}
            </Box>

            {/* NEW: legend */}
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              {(monthView === "IncomeExpenses"
                ? [
                    { label: "Income", color: "success.main" },
                    { label: "Expenses", color: "error.main" },
                  ]
                : [{ label: "Saved per month", color: "accent.main" }]
              ).map((item) => (
                <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: item.color }} />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      {/* Categories */}
      <Card sx={{ ...cardSx, p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Categories
          </Typography>
          <Segmented<CategoryFilter>
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "Expenses", label: "Expenses" },
              { value: "Income", label: "Income" },
              { value: "Savings", label: "Savings" },
            ]}
          />
        </Box>
        {/* NEW: subtitle per tab */}
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
          {categoriesSubtitle}
        </Typography>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Box sx={{ position: "relative", width: 200, height: 200 }}>
              <PieChart
                width={200}
                height={200}
                hideLegend
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                series={[
                  {
                    data: chartData,
                    innerRadius: 62,
                    outerRadius: 100,
                    paddingAngle: pieData.length > 1 ? 2 : 0,
                    cornerRadius: 4,
                  },
                ]}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {/* CHANGED: label depends on the tab ("saved in 2026" for Savings) */}
                  {categoryFilter === "Savings" ? `saved in ${year}` : "Total"}
                  <br />
                  <Typography component="strong" sx={{ fontWeight: "bold", color: "text.primary" }}>
                    <Money>{formatMoney(filterTotal)}</Money>
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {rows.map((row, i) => {
                const barColor = colorFor(i);
                const percent = filterTotal > 0 ? (row.total / filterTotal) * 100 : 0;

                return (
                  <Box key={row.id} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: 160 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: barColor }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {row.name}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "action.hover",
                          "& .MuiLinearProgress-bar": { backgroundColor: barColor },
                        }}
                      />
                    </Box>
                    {/* NEW: percentage column */}
                    <Typography variant="body2" sx={{ width: 44, textAlign: "right", color: "text.secondary" }}>
                      {Math.round(percent)}%
                    </Typography>
                    <Typography variant="body2" sx={{ width: 80, textAlign: "right", fontWeight: "bold" }}>
                      <Money>{formatMoney(row.total)}</Money>
                    </Typography>
                  </Box>
                );
              })}
              {rows.length === 0 && (
                <Typography sx={{ color: "text.secondary" }}>No data available for this view.</Typography>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
}