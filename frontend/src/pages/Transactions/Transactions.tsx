/**
 * @file Transactions page: a card with type tabs, search/sort/filter toolbar,
 * active-filter chips, the table and pagination.
 */

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { fetchTransactions, type Transaction } from "../../lib/transactions";
import { categoryById } from "../../lib/categories";
import { shortDate } from "../../lib/date";
import {
  PAGE_SIZE,
  applyFilters,
  type Sort,
  type Tab as TabValue,
} from "../../lib/transactionFilters";
import { useTransactionFilters } from "./useTransactionFilters";
import { FilterPanel } from "./FilterPanel";
import { TransactionRow } from "./TransactionRow";
import { MOCK_TRANSACTIONS, USE_MOCK_TRANSACTIONS } from "./mockTransactions";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

/** "Transfers" is the user-facing name for a contribution. */
const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "contribution", label: "Transfers" },
];

/** Chip label for an open or closed date range. */
function rangeLabel(from: string, to: string): string {
  if (from && to) return `${shortDate(from)} – ${shortDate(to)}`;
  if (from) return `From ${shortDate(from)}`;
  return `Until ${shortDate(to)}`;
}

const pillInputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 999,
    bgcolor: "background.default",
    "& fieldset": { borderColor: "divider" },
  },
} as const;

const headCellSx = {
  color: "text.secondary",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderBottomColor: "divider",
  py: 1.5,
} as const;

function Transactions() {
  const org = useCurrentOrg();
  const [rows, setRows] = useState<Transaction[] | null>(
    USE_MOCK_TRANSACTIONS ? MOCK_TRANSACTIONS : null,
  );
  const [error, setError] = useState<string | null>(null);
  const filtersApi = useTransactionFilters();
  const { filters, update, toggleCategory, clear, activeCount } = filtersApi;
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);

  /**
   * No reset on a workspace switch: AppLayout keys <main> by orgId, so this
   * page is remounted with empty state rather than re-fetching into the
   * previous workspace's.
   */
  useEffect(() => {
    if (USE_MOCK_TRANSACTIONS) return;
    const controller = new AbortController();
    fetchTransactions(org.id, controller.signal)
      .then(setRows)
      .catch((e: unknown) => {
        // Aborts come from unmount or org switch, not from a failed request.
        if (controller.signal.aborted) return;
        setError(
          e instanceof Error ? e.message : "Failed to load transactions",
        );
      });
    return () => controller.abort();
  }, [org.id]);

  // Filtering runs over every row on the client: the endpoint returns the
  // workspace's full history and takes no query params yet.
  const label = (id: number | null) => categoryById(id)?.label ?? "";
  const result = rows ? applyFilters(rows, filters, label) : null;

  /**
   * The page number is clamped when rows drop below it, so the control has to
   * follow `result`, not `filters.page`, or it would point past the last page.
   */
  const currentPage = result ? Math.min(filters.page, result.pageCount) : 1;

  return (
    <Box sx={{ px: 3, pb: 5 }}>
      <PageTitle />
      <PageActionButton onClick={() => {}}>Add transaction</PageActionButton>

      {error && <Alert severity="error">{error}</Alert>}
      {!rows && !error && <CircularProgress />}

      {result && (
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          {/* -------- Type tabs -------- */}
          <Tabs
            value={filters.tab}
            onChange={(_, tab: TabValue) => update({ tab })}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              px: 3,
              borderBottom: "1px solid",
              borderColor: "divider",
              "& .MuiTabs-indicator": {
                height: 3,
                bgcolor: "primary.dark",
              },
            }}
          >
            {TABS.map((t) => (
              <Tab
                key={t.value}
                value={t.value}
                sx={{
                  px: 0,
                  mr: 3.5,
                  minWidth: 0,
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    color: "text.primary",
                    fontWeight: 700,
                  },
                }}
                label={
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <span>{t.label}</span>
                    {/* Muted pill: the count is secondary to the label and
                        must not read as the selected state. */}
                    <Chip
                      label={result.counts[t.value]}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        bgcolor: "action.selected",
                        color: "inherit",
                        "& .MuiChip-label": { px: 1 },
                      }}
                    />
                  </Stack>
                }
              />
            ))}
          </Tabs>

          <Stack spacing={2} sx={{ px: 3, pt: 2.5, pb: 1 }}>
            {/* -------- Toolbar -------- */}
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              <TextField
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Search name or category"
                size="small"
                sx={[{ flex: 1, minWidth: 220 }, pillInputSx]}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                select
                value={filters.sort}
                // MUI types a select's value as string; SORTS is the only
                // source of options, so the cast cannot widen past Sort.
                onChange={(e) => update({ sort: e.target.value as Sort })}
                size="small"
                sx={[{ minWidth: 170 }, pillInputSx]}
              >
                {SORTS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                startIcon={<TuneIcon />}
                onClick={(e) => setFilterAnchor(e.currentTarget)}
                sx={{
                  color: "text.primary",
                  borderColor: activeCount ? "primary.main" : "divider",
                  bgcolor: activeCount ? "primary.light" : "transparent",
                  fontWeight: 600,
                }}
              >
                Filters
                {activeCount > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      minWidth: 22,
                      height: 22,
                      px: 0.75,
                      borderRadius: 999,
                      bgcolor: "primary.dark",
                      color: "primary.contrastText",
                      fontSize: "0.8rem",
                      lineHeight: "22px",
                      textAlign: "center",
                    }}
                  >
                    {activeCount}
                  </Box>
                )}
              </Button>
            </Stack>

            {/* -------- Active filters -------- */}
            {activeCount > 0 && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: "wrap", alignItems: "center", rowGap: 1 }}
              >
                {(filters.from || filters.to) && (
                  <Chip
                    label={rangeLabel(filters.from, filters.to)}
                    onDelete={() => update({ from: "", to: "" })}
                    sx={{ bgcolor: "primary.light", fontWeight: 500 }}
                  />
                )}
                {filters.categories.map((id) => (
                  <Chip
                    key={id}
                    label={categoryById(id)?.label ?? `Category ${id}`}
                    onDelete={() => toggleCategory(id)}
                    sx={{ bgcolor: "primary.light", fontWeight: 500 }}
                  />
                ))}
                {filters.taxDeductible && (
                  <Chip
                    label="Tax refundable"
                    onDelete={() => update({ taxDeductible: false })}
                    sx={{ bgcolor: "primary.light", fontWeight: 500 }}
                  />
                )}
                <Button
                  onClick={clear}
                  sx={{ color: "text.primary", fontWeight: 600, px: 1 }}
                >
                  Clear all
                </Button>
              </Stack>
            )}

            <FilterPanel
              anchor={filterAnchor}
              onClose={() => setFilterAnchor(null)}
              {...filtersApi}
            />

            {/* -------- Table -------- */}
            <Box sx={{ overflowX: "auto" }}>
              <Table sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={[headCellSx, { width: 120 }]}>
                      Date
                    </TableCell>
                    <TableCell sx={headCellSx}>Name</TableCell>
                    <TableCell sx={[headCellSx, { width: 200 }]}>
                      Category
                    </TableCell>
                    <TableCell sx={[headCellSx, { width: 160 }]} align="right">
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.page.map((t) => (
                    <TransactionRow key={t.id} transaction={t} />
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* Distinguishes an empty workspace from filters that match
                nothing: the second is the user's own doing and is undone by
                clearing. */}
            {result.total === 0 && (
              <Typography
                color="text.secondary"
                sx={{ textAlign: "center", py: 4 }}
              >
                {rows?.length
                  ? "No transactions match these filters."
                  : "No transactions yet."}
              </Typography>
            )}

            {/* -------- Footer -------- */}
            {result.total > 0 && (
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1,
                  py: 1,
                }}
              >
                <Typography color="text.secondary">
                  Showing {result.page.length} of {result.total}
                </Typography>
                {result.total > PAGE_SIZE && (
                  <Pagination
                    count={result.pageCount}
                    page={currentPage}
                    onChange={(_, page) => update({ page })}
                    shape="rounded"
                    sx={{
                      "& .MuiPaginationItem-root": {
                        fontSize: "0.95rem",
                        color: "text.secondary",
                      },
                      "& .MuiPaginationItem-page.Mui-selected": {
                        bgcolor: "primary.light",
                        color: "text.primary",
                        fontWeight: 600,
                      },
                      "& .MuiPaginationItem-previousNext": {
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 999,
                      },
                    }}
                  />
                )}
              </Stack>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

export { Transactions as Component };
