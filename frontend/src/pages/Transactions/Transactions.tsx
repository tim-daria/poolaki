/**
 * @file Transactions page: a card with type tabs, search/sort/filter toolbar,
 * active-filter chips, the list and pagination.
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
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import {
  fetchTransactionPage,
  type Transaction,
  type TransactionPage,
} from "../../lib/transactions";
import { categoryById } from "../../lib/categories";
import { shortDate } from "../../lib/date";
import {
  PAGE_SIZE,
  QUERY_MAX_LENGTH,
  type Sort,
  type Tab as TabValue,
} from "../../lib/transactionFilters";
import { useTransactionFilters } from "./useTransactionFilters";
import { FilterPanel } from "./FilterPanel";
import { tintedWhenActive } from "./styles";
import {
  TransactionList,
  TransactionListItem,
} from "../../components/Transactions/TransactionListItem";
import { TransactionForm } from "../../components/Modals/TransactionForm";
import { useCategories } from "../../hooks/useCategories";
import { useGoals } from "../../hooks/useGoals";
import { useMembers } from "../../hooks/useMembers";
import { PAGE_PADDING, PHONE_QUERY, TABLET } from "../../lib/layout";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

/** "Transfers" is the user-facing name for a contribution; withdrawals get a tab of their own. */
const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "contribution", label: "Transfers" },
  { value: "withdraw", label: "Withdrawals" },
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

/** Chips in the active-filters row. */
const activeChipSx = { bgcolor: "primary.light", fontWeight: 500 } as const;

function Transactions() {
  const org = useCurrentOrg();
  const categories = useCategories();
  const goals = useGoals();
  const members = useMembers();
  const phone = useMediaQuery(PHONE_QUERY);
  type Loaded =
    { data: TransactionPage; error: null } | { data: null; error: string };
  const [result, setResult] = useState<Loaded | null>(null);
  const data = result?.data ?? null;
  const error = result?.error ?? null;
  const [version, setVersion] = useState(0);
  const filtersApi = useTransactionFilters();
  const { filters, update, toggleCategory, toggleMember, clear, activeCount } =
    filtersApi;
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const requestKey = JSON.stringify(filters) + version;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const loading = loadedKey !== requestKey;

  /**
   * No reset on a workspace switch: AppLayout keys <main> by orgId, so this
   * page is remounted with empty state rather than re-fetching into the
   * previous workspace's.
   */
  useEffect(() => {
    const controller = new AbortController();
    fetchTransactionPage(org.id, filters, controller.signal)
      .then((data) => {
        setResult({ data, error: null });
        setLoadedKey(requestKey);
      })
      .catch((e: unknown) => {
        // Aborts come from unmount or org switch, not from a failed request.
        if (controller.signal.aborted) return;
        setResult({
          data: null,
          error: e instanceof Error ? e.message : "Failed to load transactions",
        });
      });
    return () => controller.abort();
  }, [org.id, filters, version, requestKey]);

  const refresh = () => setVersion((v) => v + 1);
  const withPerson = !org.is_personal;

  return (
    <Box sx={{ ...PAGE_PADDING, pb: 5 }}>
      <PageTitle />
      <PageActionButton onClick={() => setAdding(true)}>
        Add transaction
      </PageActionButton>

      <TransactionForm
        open={adding || editing !== null}
        transaction={editing ?? undefined}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={refresh}
        onDeleted={refresh}
      />

      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && <CircularProgress />}

      {data && (
        // A container card, no role: the tabs and list inside carry their
        // own semantics, and the page heading above names it. Zero padding
        // because the tabs and toolbar pad themselves, with the card's own
        // step between phone and tablet.
        <Paper variant="card" sx={{ p: 0, overflow: "hidden" }}>
          {/* -------- Type tabs -------- */}
          <Tabs
            value={filters.tab}
            onChange={(_, tab: TabValue) => update({ tab })}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              px: "var(--card-padding)",
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
                      label={data.counts[t.value]}
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

          <Stack spacing={2} sx={{ px: "var(--card-padding)", pt: 2.5, pb: 1 }}>
            {/* -------- Toolbar -------- */}
            <Stack
              direction="row"
              spacing={1.5}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <TextField
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Search name, category or member"
                size="small"
                // On a phone the search owns the first row and the sort
                // grows to close the second, so both rows end on one edge.
                sx={[
                  {
                    flex: 1,
                    minWidth: 220,
                    flexBasis: "100%",
                    [TABLET]: { flexBasis: "auto" },
                  },
                  pillInputSx,
                ]}
                slotProps={{
                  htmlInput: { maxLength: QUERY_MAX_LENGTH },
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
                sx={[
                  // No floor on a phone: the row is too narrow for one next
                  // to the Filters button, and growing already fills it.
                  {
                    flex: 1,
                    minWidth: 0,
                    [TABLET]: { flex: "0 0 auto", minWidth: 170 },
                  },
                  pillInputSx,
                ]}
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
                sx={tintedWhenActive(activeCount > 0)}
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
                    sx={activeChipSx}
                  />
                )}
                {filters.categories.map((id) => (
                  <Chip
                    key={id}
                    label={
                      categoryById(categories, id)?.name ?? `Category ${id}`
                    }
                    onDelete={() => toggleCategory(id)}
                    sx={activeChipSx}
                  />
                ))}
                {filters.members.map((id) => (
                  <Chip
                    key={`member-${id}`}
                    label={
                      members.find((m) => m.user_id === id)?.username ??
                      `Member ${id}`
                    }
                    onDelete={() => toggleMember(id)}
                    sx={activeChipSx}
                  />
                ))}
                {filters.taxDeductible && (
                  <Chip
                    label="Tax refundable"
                    onDelete={() => update({ taxDeductible: false })}
                    sx={activeChipSx}
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
              categories={categories}
              members={members}
              anchor={filterAnchor}
              onClose={() => setFilterAnchor(null)}
              matchCount={data.total}
              {...filtersApi}
            />

            {/* -------- List -------- */}
            {data.rows.length > 0 && (
              <TransactionList
                withPerson={withPerson}
                aria-label="Transactions"
                sx={{
                  py: 1,
                  opacity: loading ? 0.6 : 1,
                  transition: "opacity 150ms",
                }}
              >
                {data.rows.map((t) => (
                  <TransactionListItem
                    key={t.id}
                    transaction={t}
                    categories={categories}
                    goals={goals}
                    withPerson={withPerson}
                    onClick={setEditing}
                  />
                ))}
              </TransactionList>
            )}

            {/* Distinguishes an empty workspace from filters that match
                nothing: the second is the user's own doing and is undone by
                clearing. */}
            {data.total === 0 && (
              <Typography
                color="text.secondary"
                sx={{ textAlign: "center", py: 4 }}
              >
                {activeCount === 0 && filters.q === "" && data.counts.all === 0
                  ? "No transactions yet."
                  : "No transactions match these filters."}
              </Typography>
            )}

            {/* -------- Footer -------- */}
            {data.total > 0 && (
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
                  Showing {data.rows.length} of {data.total}
                </Typography>
                {data.total > PAGE_SIZE && (
                  <Pagination
                    count={data.page_count}
                    page={data.page}
                    onChange={(_, page) => update({ page })}
                    shape="rounded"
                    siblingCount={phone ? 0 : 1}
                    size={phone ? "small" : "medium"}
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
        </Paper>
      )}
    </Box>
  );
}

export { Transactions as Component };
