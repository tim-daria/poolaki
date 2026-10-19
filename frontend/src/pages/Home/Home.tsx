/**
 * @file Workspace overview: greeting or member list, a setup checklist for a
 * new personal workspace, then the balance and month card, recent activity,
 * top spending and the nearest goal.
 */

import { useEffect, useId, useState } from "react";
import { Link as RouterLink } from "react-router";
import { Alert, Box, CircularProgress, Paper } from "@mui/material";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import {
  PageActionButton,
  PageHeading,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { OrgMembers } from "../../components/OrgMembers/OrgMembers";
import { GoalForm } from "../../components/Modals/GoalForm";
import { StartingBalanceForm } from "../../components/Modals/StartingBalanceForm";
import { TransactionForm } from "../../components/Modals/TransactionForm";
import { fetchBalance } from "../../lib/balance";
import { TODAY, longDate, monthBounds, monthName } from "../../lib/date";
import { getGoals, type Goal } from "../../lib/goals";
import {
  DEFAULT_SCALE_FLOOR,
  balanceChange,
  columnScaleMax,
  monthSummary,
  recentTransactions,
  spendingByCategory,
} from "../../lib/overview";
import {
  fetchYearlyReport,
  type YearlyReportResponse,
} from "../../lib/reports";
import { fetchTransactions, type Transaction } from "../../lib/transactions";
import { HomeGoalCard } from "./HomeGoalCard";
import { MonthlySummaryCard } from "./MonthlySummaryCard";
import { NetBalanceCard } from "./NetBalanceCard";
import { RECENT_ROWS, RecentActivityCard } from "./RecentActivityCard";
import { SetupBanner, type SetupStep } from "./SetupBanner";
import { TopSpendingCard } from "./TopSpendingCard";
import { DESKTOP, PAGE_PADDING, TABLET } from "../../lib/layout";
import { fetchCategories, type Category } from "../../lib/categories";

function greeting(hour: number) {
  if (hour < 12) return "Good Morning!";
  if (hour < 18) return "Good Afternoon!";
  return "Good Evening!";
}

function setupDismissedKey(orgId: number) {
  return `home:setup-dismissed:${orgId}`;
}

/** Storage is guarded: a blocked localStorage must not break the page. */
function readDismissed(orgId: number): boolean {
  try {
    return localStorage.getItem(setupDismissedKey(orgId)) === "true";
  } catch {
    return false;
  }
}

type Modal = "transaction" | "goal" | "balance" | null;

type Loaded = {
  /** This year's report: the month's income and expenses, spending by category. Null when it failed. */
  report: YearlyReportResponse | null;
  /** The newest RECENT_ROWS rows. */
  recent: Transaction[];
  /** This month's rows, for the savings figure the report does not carry yet. */
  monthRows: Transaction[];
  balance: number;
  goals: Goal[];
  categories: Category[];
};

function Home() {
  const org = useCurrentOrg();
  const now = new Date();
  const monthInfoId = useId();

  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumped after a save or delete, since either moves the balance. */
  const [version, setVersion] = useState(0);

  const [modal, setModal] = useState<Modal>(null);
  const [setupDismissed, setSetupDismissed] = useState(() =>
    readDismissed(org.id),
  );

  /**
   * No reset on a workspace switch: AppLayout keys <main> by orgId. A refetch
   * keeps the previous figures on screen until the new ones arrive.
   */
  useEffect(() => {
    const controller = new AbortController();
    const { from, to } = monthBounds(TODAY);
    const report = fetchYearlyReport(
      org.id,
      Number(TODAY.slice(0, 4)),
      controller.signal,
    ).catch((e: unknown) => {
      if (controller.signal.aborted) throw e;
      // The cause goes to the console; the cards say only that it is missing.
      console.error(e);
      return null;
    });
    Promise.all([
      report,
      fetchTransactions(org.id, { pageSize: RECENT_ROWS }, controller.signal),
      // TODO(report): drop once the report carries contribution and withdraw sums.
      fetchTransactions(org.id, { from, to, pageSize: 100 }, controller.signal),
      fetchBalance(org.id, controller.signal),
      getGoals(org.id, controller.signal),
      fetchCategories(org.id, controller.signal),
    ])
      .then(([report, recent, monthRows, balance, goals, categories]) => {
        setData({ report, recent, monthRows, balance, goals, categories });
        setError(null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load overview");
      });
    return () => controller.abort();
  }, [org.id, version]);

  const refresh = () => setVersion((v) => v + 1);

  function dismissSetup() {
    setSetupDismissed(true);
    try {
      localStorage.setItem(setupDismissedKey(org.id), "true");
    } catch {
      // Dismissed for this visit only.
    }
  }

  const header = (
    <>
      {/* Personal workspaces have no members, so they show a greeting instead. */}
      {org.is_personal ? (
        <PageTitle title={greeting(now.getHours())} subtitle={longDate(now)} />
      ) : (
        <PageHeading>
          <OrgMembers />
        </PageHeading>
      )}
      <PageActionButton onClick={() => setModal("transaction")}>
        Add transaction
      </PageActionButton>
    </>
  );

  const modals = (
    <>
      <TransactionForm
        open={modal === "transaction"}
        onClose={() => setModal(null)}
        onSaved={refresh}
        onDeleted={refresh}
      />
      <GoalForm open={modal === "goal"} onClose={() => setModal(null)} />
      <StartingBalanceForm
        open={modal === "balance"}
        onClose={() => setModal(null)}
        onSaved={refresh}
      />
    </>
  );

  const pageSx = {
    ...PAGE_PADDING,
    pb: 5,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    [TABLET]: { ...PAGE_PADDING[TABLET], gap: 3 },
  } as const;

  if (data === null) {
    return (
      <Box sx={pageSx}>
        {header}
        {error ? <Alert severity="error">{error}</Alert> : <CircularProgress />}
        {modals}
      </Box>
    );
  }

  const { report, recent, monthRows, balance, goals, categories } = data;
  const summary = report && monthSummary(report, monthRows, TODAY);
  const scaleMax = summary
    ? columnScaleMax(
        [summary.income, summary.expenses, summary.saved],
        DEFAULT_SCALE_FLOOR,
      )
    : DEFAULT_SCALE_FLOOR;

  // Personal workspaces only: a shared one has its balance from creation and
  // its members already know the app.
  const steps: SetupStep[] = [
    {
      label: "Set starting balance",
      done: balance !== 0,
      onClick: () => setModal("balance"),
    },
    {
      label: "Add your first transaction",
      done: recent.length > 0,
      onClick: () => setModal("transaction"),
    },
    {
      label: "Create a savings goal",
      done: goals.length > 0,
      onClick: () => setModal("goal"),
    },
  ];
  const showSetup =
    org.is_personal && !setupDismissed && steps.some((s) => !s.done);

  return (
    <Box sx={pageSx}>
      {header}

      {error && <Alert severity="error">{error}</Alert>}

      {showSetup && <SetupBanner steps={steps} onDismiss={dismissSetup} />}

      {/* One card, two halves. Both stretch to the same height and pin their
          caption to the bottom, so the two captions share a baseline. */}
      <Paper
        component={RouterLink}
        to="reports"
        aria-label="Balance and month, see reports"
        aria-describedby={monthInfoId}
        variant="clickableCard"
        sx={[
          {
            // The halves carry the padding, so the divider can run full height.
            p: 0,
            display: "flex",
            flexDirection: "column",
            [TABLET]: { flexDirection: "row" },
          },
        ]}
      >
        <Box
          sx={{
            display: "flex",
            p: "var(--card-padding)",
            [TABLET]: { width: "45%", flexShrink: 0 },
            [DESKTOP]: { width: 400 },
          }}
        >
          <NetBalanceCard
            balance={balance}
            change={summary && balanceChange(summary)}
            monthStart={`${TODAY.slice(0, 7)}-01`}
          />
        </Box>
        <Box
          aria-hidden
          sx={{
            // The same hairline as the activity rows' dividers.
            borderTop: "1px solid var(--mui-palette-divider)",
            mx: "var(--card-padding)",
            [TABLET]: {
              borderTop: 0,
              borderLeft: "1px solid var(--mui-palette-divider)",
              mx: 0,
              my: "var(--card-padding)",
            },
          }}
        />
        <Box
          sx={{
            display: "flex",
            flex: 1,
            minWidth: 0,
            p: "var(--card-padding)",
          }}
        >
          <MonthlySummaryCard
            summary={summary}
            month={monthName(TODAY)}
            year={Number(TODAY.slice(0, 4))}
            scaleMax={scaleMax}
            descriptionId={monthInfoId}
          />
        </Box>
      </Paper>

      {/* One grid, three named areas. Phone: a column, the goal ahead of
          spending. Tablet: the list full width, the two cards sharing a row.
          Desktop: the list beside a sidebar of the two cards, spending on top
          and stretching so the ring shrinks with the row it is given. */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateAreas: `"activity" "goal" "spending"`,
          [TABLET]: {
            gap: 3,
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridTemplateAreas: `"activity activity" "spending goal"`,
          },
          [DESKTOP]: {
            // The sidebar gives way on narrow desktops so the activity card
            // keeps room for its rows.
            gridTemplateColumns: "minmax(0, 1fr) min(380px, 40%)",
            gridTemplateRows: "1fr auto",
            gridTemplateAreas: `"activity spending" "activity goal"`,
          },
        }}
      >
        <RecentActivityCard
          sx={{ gridArea: "activity" }}
          rows={recentTransactions(recent, RECENT_ROWS)}
          categories={categories}
          goals={goals}
          shared={!org.is_personal}
          onAdd={() => setModal("transaction")}
        />
        <TopSpendingCard
          sx={{ gridArea: "spending" }}
          slices={report && spendingByCategory(report, TODAY)}
        />
        <HomeGoalCard
          sx={{ gridArea: "goal" }}
          goals={goals}
          onCreateGoal={() => setModal("goal")}
        />
      </Box>

      {modals}
    </Box>
  );
}

// Named export required by react-router's route-level `lazy`.
export { Home as Component };
