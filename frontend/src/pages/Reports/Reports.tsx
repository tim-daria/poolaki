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
  Typography,
  GlobalStyles,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { PieChart } from "@mui/x-charts";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useChartColors } from "../../hooks/useChartColors";
import {
  fetchYearlyReport,
  type YearlyReportResponse,
} from "../../lib/reports";
import { parseMoney } from "../../lib/money";
import { Money } from "../../components/Money";
import {
  PageHeading,
  PageActionButton,
} from "../../components/PageHeader/PageHeader";
import { MonthlyChart } from "./MonthlyChart";
import { Segmented } from "./Segmented";
import { eur } from "./eur";

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
// Saved per month (index 0 = January)
const mockMonthlySavings = [
  1100, 1300, 900, 1500, 1000, 1200, 800, 1400, 1455, 0, 0, 0,
];
// Savings by goal, used by the Categories tab "Savings"
const mockGoalSavings = [
  { id: "g1", name: "Emergency fund", total: 4200 },
  { id: "g2", name: "Trip to Barcelona", total: 2300 },
  { id: "g3", name: "New laptop", total: 1790 },
  { id: "g4", name: "Without a goal", total: 915 },
];

type SummaryCardProps = {
  label: string;
  amount: string;
  color: "success.main" | "error.main" | "primary.main";
};

function SummaryCard({ label, amount, color }: SummaryCardProps) {
  return (
    <Card sx={cardSx}>
      <CardContent>
        <Typography
          variant="body2"
          gutterBottom
          sx={{ color: "text.secondary" }}
        >
          {label}
        </Typography>
        <Typography
          variant="mono"
          sx={{ color, fontWeight: "bold", display: "block" }}
        >
          <Money>{amount}</Money>
        </Typography>
      </CardContent>
    </Card>
  );
}

type CategoryFilter = "Expenses" | "Income" | "Savings";

export function Component() {
  const org = useCurrentOrg();
  const chartColors = useChartColors();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [reportData, setReportData] = useState<YearlyReportResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>("Expenses");

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchYearlyReport(org.id, year, controller.signal);
        setReportData(data);
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
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

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography sx={{ color: "error.main" }}>
          Error loading report data.
        </Typography>
      </Box>
    );
  }

  // Every view is normalized to the same row shape (real data or mock goals)
  const rows =
    categoryFilter === "Savings"
      ? mockGoalSavings.map((g) => ({ id: g.id, name: g.name, total: g.total }))
      : reportData.categories
          .filter(
            (c) =>
              c.type === (categoryFilter === "Expenses" ? "expense" : "income"),
          )
          .map((c) => ({
            id: c.category_id,
            name: c.name,
            total: parseMoney(c.total),
          }));

  const filterTotal = rows.reduce((sum, r) => sum + r.total, 0);

  // Lavender shade per row, shared by the donut slice and its list row
  const colorFor = (index: number) => chartColors.shade(index, rows.length);

  const pieData = rows.map((r, i) => ({
    id: r.id,
    value: r.total,
    label: r.name,
    color: colorFor(i),
  }));
  const chartData =
    pieData.length > 0
      ? pieData
      : [{ id: "empty", value: 1, label: "", color: chartColors.empty }];

  const categoriesSubtitle =
    categoryFilter === "Savings"
      ? `Savings by goal in ${year} · ${eur(filterTotal)}`
      : `Share of all ${categoryFilter.toLowerCase()} in ${year} · ${eur(filterTotal)}`;

  return (
    <Box sx={{ p: 3, maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <GlobalStyles
        styles={{
          "@media print": {
            "@page": { margin: "12mm" },
            "*": { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" },
            ".MuiDrawer-root, .MuiAppBar-root": { display: "none !important" },
            main: {
              margin: "0 !important",
              padding: "0 !important",
              width: "100% !important",
            },
          },
        }}
      />

      {/* Print-only title: the real one lives in the header portal, which is hidden on paper */}
      <Box
        sx={{ display: "none", "@media print": { display: "block" }, mb: 2 }}
      >
        <Typography variant="h4" component="h1">
          Reports {year}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Income, expenses and savings for the year
        </Typography>
      </Box>

      {/* 
        Injects the title, year selector, and secondary actions directly into 
        the global AppLayout Header via the PageHeading portal. 
      */}
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

      {/* Primary Action Button overrides the default Add icon with Print */}
      <PageActionButton
        startIcon={<PrintIcon />}
        variant="outlined"
        color="inherit"
        onClick={() => window.print()}
        sx={{
          borderRadius: 8,
          borderColor: "divider",
          "@media print": { display: "none" },
        }}
      >
        Print
      </PageActionButton>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard
            label="Income"
            amount={eur(reportData.totals.income)}
            color="success.main"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard
            label="Expenses"
            amount={eur(reportData.totals.expense)}
            color="error.main"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SummaryCard
            label="Set aside"
            amount={eur(mockSavingsAmount)}
            color="primary.main"
          />
        </Grid>
      </Grid>

      {/* By month */}
      <MonthlyChart
        monthly={reportData.monthly}
        year={year}
        savingsByMonth={mockMonthlySavings}
        sx={{ mb: 4 }}
      />

      {/* Categories */}
      <Card sx={{ ...cardSx, p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
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
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
          {categoriesSubtitle}
        </Typography>

        <Grid container spacing={4}>
          <Grid
            size={{ xs: 12, md: 4 }}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box sx={{ position: "relative", width: 200, height: 200 }}>
              <PieChart
                width={200}
                height={200}
                hideLegend // the list on the right acts as the legend
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                series={[
                  {
                    data: chartData,
                    innerRadius: 62, // makes it a donut instead of a pie
                    outerRadius: 100,
                    paddingAngle: pieData.length > 1 ? 2 : 0,
                    cornerRadius: 4,
                  },
                ]}
              />
              {/* Center label over the donut hole; pointerEvents none keeps tooltips working */}
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
                  {categoryFilter === "Savings" ? `saved in ${year}` : "Total"}
                  <br />
                  <Typography
                    component="strong"
                    sx={{ fontWeight: "bold", color: "text.primary" }}
                  >
                    <Money>{eur(filterTotal)}</Money>
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {rows.map((row, i) => {
                const barColor = colorFor(i);
                const percent =
                  filterTotal > 0 ? (row.total / filterTotal) * 100 : 0;

                return (
                  <Box
                    key={row.id}
                    sx={{ display: "flex", alignItems: "center", gap: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        width: 160,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: barColor,
                        }}
                      />
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
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: barColor,
                          },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        width: 44,
                        textAlign: "right",
                        color: "text.secondary",
                      }}
                    >
                      {Math.round(percent)}%
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ width: 96, textAlign: "right", fontWeight: "bold" }}
                    >
                      <Money>{eur(row.total)}</Money>
                    </Typography>
                  </Box>
                );
              })}
              {rows.length === 0 && (
                <Typography sx={{ color: "text.secondary" }}>
                  No data available for this view.
                </Typography>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
}
