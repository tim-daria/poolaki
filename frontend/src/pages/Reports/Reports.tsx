/** @file Reports page: the yearly report as summary tiles, a monthly column chart and a category donut, with a print layout. */

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  GlobalStyles,
  MenuItem,
  Select,
  Typography,
  type SelectChangeEvent,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import {
  fetchYearlyReport,
  REPORT_UNAVAILABLE,
  type YearlyReportResponse,
} from "../../lib/reports";
import { fetchTransactionPage } from "../../lib/transactions";
import { savingsByGoal, savingsByMonth, savingsTotal } from "../../lib/savings";
import { yearOptions } from "../../lib/reportYears";
import { PAGE_PADDING, PRINT, TABLET } from "../../lib/layout";
import {
  PageHeading,
  PageActionButton,
} from "../../components/PageHeader/PageHeader";
import { SummaryCards } from "./SummaryCards";
import { MonthlyChart } from "./MonthlyChart";
import { CategoriesCard } from "./CategoriesCard";

const SUBTITLE = "Income, expenses and savings for the year";

const pageSx = {
  ...PAGE_PADDING,
  pb: 5,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  [TABLET]: { ...PAGE_PADDING[TABLET], gap: 3 },
} as const;

/** Page setup only: the shell, header and cards each carry their own print rule. */
const printStyles = {
  [PRINT]: {
    "@page": { size: "auto", margin: "12mm" },
    "*": { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" },
  },
} as const;

export function Component() {
  const org = useCurrentOrg();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [earliestYear, setEarliestYear] = useState<number | null>(null);
  const [reportData, setReportData] = useState<YearlyReportResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setIsLoading(true);
      setError(false);
      try {
        const data = await fetchYearlyReport(org.id, year, controller.signal);
        setReportData(data);
        setIsLoading(false);
      } catch (err: unknown) {
        // An aborted request (StrictMode remount, year or org switch) is not a
        // failure; touching state here would flash the error before the live
        // request lands.
        if (controller.signal.aborted) return;
        console.error(err);
        setReportData(null);
        setError(true);
        setIsLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [org.id, year]);

  // The oldest row sets how far back the year selector goes. Optional: a
  // failure leaves the current year alone and never blocks the report.
  useEffect(() => {
    const controller = new AbortController();
    fetchTransactionPage(
      org.id,
      {
        tab: "all",
        q: "",
        sort: "oldest",
        from: "",
        to: "",
        categories: [],
        members: [],
        taxDeductible: false,
        page: 1,
      },
      controller.signal,
    )
      .then((res) => {
        const first = res.rows[0];
        setEarliestYear(
          first ? new Date(first.transaction_date).getFullYear() : null,
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [org.id]);

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setYear(Number(event.target.value));
  };

  return (
    <Box sx={pageSx}>
      <GlobalStyles styles={printStyles} />

      {/* Heading visible only in print, where the app header is hidden. */}
      <Box sx={{ display: "none", [PRINT]: { display: "block" } }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: "bold" }}>
          Reports {year}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
          {SUBTITLE}
        </Typography>
      </Box>

      <PageHeading>
        {/* The year selector sits inside the heading to share its type and brand colour. */}
        <Typography variant="h2" component="h1" sx={{ lineHeight: 1.2 }}>
          Reports{" "}
          <Select
            value={year}
            onChange={handleYearChange}
            variant="standard"
            disableUnderline
            inputProps={{ "aria-label": "Year" }}
            sx={{
              ml: 1,
              fontSize: "inherit",
              fontWeight: "inherit",
              color: "primary.main",
              "& .MuiSelect-select": { py: 0 },
              "& .MuiSelect-icon": { color: "primary.main" },
            }}
          >
            {yearOptions(earliestYear, currentYear).map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {SUBTITLE}
        </Typography>
      </PageHeading>

      <PageActionButton
        startIcon={<PrintIcon />}
        onClick={() => window.print()}
        disabled={reportData === null}
        sx={{ [PRINT]: { display: "none" } }}
      >
        Print
      </PageActionButton>

      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">{REPORT_UNAVAILABLE}</Alert>}
      {reportData && (
        <>
          <SummaryCards
            totals={reportData.totals}
            setAside={savingsTotal(reportData.totals)}
          />
          <MonthlyChart
            monthly={reportData.monthly}
            year={year}
            savingsByMonth={savingsByMonth(reportData.monthly)}
          />

          {/* Print-only page break so the categories card starts a fresh page. */}
          <Box
            sx={{
              display: "none",
              [PRINT]: { display: "block", breakBefore: "page" },
            }}
          />
          <CategoriesCard
            categories={reportData.categories}
            savingsByGoal={savingsByGoal(reportData.goals)}
            year={year}
          />
        </>
      )}
    </Box>
  );
}
