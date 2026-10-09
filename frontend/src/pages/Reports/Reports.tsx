import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  MenuItem,
  Select,
  SelectChangeEvent,
  CircularProgress,
  Stack,
  LinearProgress,
  ButtonGroup,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { fetchYearlyReport, type YearlyReportResponse } from "../../lib/reports";
import { Money } from "../../components/Money";
import { PageHeading, PageActionButton } from "../../components/PageHeader/PageHeader";
import { toMoneyString } from "../../lib/money";

export default function Reports() {
  const org = useCurrentOrg();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [reportData, setReportData] = useState<YearlyReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<"Expenses" | "Income" | "Savings">("Expenses");

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

  const formatMoney = (amount: string) => {
    const num = parseFloat(amount);
    return `€${num.toLocaleString("es-ES", { minimumFractionDigits: 0 })}`;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box p={4}>
        <Typography color="error">Error loading report data.</Typography>
      </Box>
    );
  }

  // Mocked savings amount. To Do: replace it once goal logic (Withdraw) is added to the endpoint.
  const mockSavingsAmount = "9205.00";

  const displayedCategories =
    categoryFilter === "Savings"
      ? []
      : reportData.categories.filter((c) => c.type === (categoryFilter === "Expenses" ? "expense" : "income"));

  const getButtonVariant = (filterName: string) => (categoryFilter === filterName ? "contained" : "outlined");

  return (
    <Box p={3} maxWidth="1200px" margin="0 auto" width="100%">
      {/* 
        Injects the title, year selector, and secondary actions directly into 
        the global AppLayout Header via the PageHeading portal. 
      */}
      <PageHeading>
        <Box display="flex" alignItems="center" gap={1}>
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Income, expenses and savings for the year
        </Typography>
      </PageHeading>

      {/* Primary Action Button overrides the default Add icon with Print */}
      <PageActionButton
        startIcon={<PrintIcon />}
        variant="outlined"
        color="inherit"
        onClick={() => window.print()}
        sx={{ borderRadius: 8, borderColor: "divider" }}
      >
        Print
      </PageActionButton>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 4, boxShadow: "none", border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Income
              </Typography>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                <Money>{formatMoney(reportData.totals.income)}</Money>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 4, boxShadow: "none", border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Expenses
              </Typography>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                <Money>{formatMoney(reportData.totals.expense)}</Money>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 4, boxShadow: "none", border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Set aside
              </Typography>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                <Money>{formatMoney(mockSavingsAmount)}</Money>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chart UI Mock (Income vs Expenses) */}
      <Card sx={{ borderRadius: 4, mb: 4, boxShadow: "none", border: "1px solid", borderColor: "divider", p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h6" fontWeight="bold">
            By month
          </Typography>
          <ButtonGroup size="small" sx={{ borderRadius: 8 }}>
            <Button
              variant="contained"
              disableElevation
              sx={{ borderRadius: "16px 0 0 16px", bgcolor: "action.hover", color: "text.primary" }}
            >
              Income & expenses
            </Button>
            <Button variant="outlined" sx={{ borderRadius: "0 16px 16px 0", borderColor: "divider", color: "text.secondary" }}>
              Savings
            </Button>
          </ButtonGroup>
        </Box>
        <Box height={200} display="flex" alignItems="flex-end" gap={2}>
          {reportData.monthly.map((m) => {
            const maxValue = 5000;
            const incomeHeight = Math.min((parseFloat(m.income) / maxValue) * 100, 100);
            const expenseHeight = Math.min((parseFloat(m.expense) / maxValue) * 100, 100);
            const monthName = new Date(year, m.month - 1).toLocaleString("en", { month: "short" });

            return (
              <Box key={m.month} flex={1} display="flex" flexDirection="column" alignItems="center" height="100%">
                <Box display="flex" gap={0.5} alignItems="flex-end" height="100%" width="100%" justifyContent="center">
                  <Box width="16px" height={`${incomeHeight}%`} bgcolor="success.light" borderRadius="4px 4px 0 0" />
                  <Box width="16px" height={`${expenseHeight}%`} bgcolor="error.light" borderRadius="4px 4px 0 0" />
                </Box>
                <Typography variant="caption" color="text.secondary" mt={1}>
                  {monthName}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Card>

      {/* Category Breakdown Table */}
      <Card sx={{ borderRadius: 4, boxShadow: "none", border: "1px solid", borderColor: "divider", p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h6" fontWeight="bold">
            Categories
          </Typography>
          <ButtonGroup size="small">
            <Button
              variant={getButtonVariant("Expenses")}
              onClick={() => setCategoryFilter("Expenses")}
              disableElevation
              sx={{ borderRadius: "16px 0 0 16px" }}
            >
              Expenses
            </Button>
            <Button variant={getButtonVariant("Income")} onClick={() => setCategoryFilter("Income")} disableElevation>
              Income
            </Button>
            <Button
              variant={getButtonVariant("Savings")}
              onClick={() => setCategoryFilter("Savings")}
              disableElevation
              sx={{ borderRadius: "0 16px 16px 0" }}
            >
              Savings
            </Button>
          </ButtonGroup>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4} display="flex" justifyContent="center" alignItems="center">
            {/* Reserved space for the donut chart in a future iteration */}
            <Box
              width={200}
              height={200}
              borderRadius="50%"
              border="24px solid"
              borderColor="divider"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Typography variant="body2" color="text.secondary" align="center">
                Total
                <br />
                <Typography component="strong" fontWeight="bold" color="text.primary">
                  <Money>{categoryFilter === "Expenses" ? formatMoney(reportData.totals.expense) : formatMoney(reportData.totals.income)}</Money>
                </Typography>
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              {displayedCategories.map((cat) => {
                const barColor = cat.type === "expense" ? "primary.main" : "success.main";
                const progressWidth = 45; // Fixed width temporarily

                return (
                  <Box key={cat.category_id} display="flex" alignItems="center" gap={2}>
                    <Box display="flex" alignItems="center" gap={1} width="160px">
                      <Box width={8} height={8} borderRadius="50%" sx={{ bgcolor: barColor }} />
                      <Typography variant="body2" fontWeight="500">
                        {cat.name}
                      </Typography>
                    </Box>
                    <Box flex={1}>
                      <LinearProgress
                        variant="determinate"
                        value={progressWidth}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "action.hover",
                          "& .MuiLinearProgress-bar": { backgroundColor: barColor },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" width="80px" textAlign="right" fontWeight="bold">
                      <Money>{formatMoney(cat.total)}</Money>
                    </Typography>
                  </Box>
                );
              })}
              {displayedCategories.length === 0 && <Typography color="text.secondary">No data available for this view.</Typography>}
            </Stack>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
}