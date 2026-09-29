/**
 * @file Workspace overview: greeting or member list, a setup checklist for a
 * new personal workspace, then the balance and month card, recent activity,
 * top spending and the nearest goal.
 */

import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import { Alert, Box, CircularProgress, Paper } from "@mui/material";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useCategories } from "../../hooks/useCategories";
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
import { TODAY, monthName } from "../../lib/date";
import { getGoals, type Goal } from "../../lib/goals";
import {
  DEFAULT_SCALE_FLOOR,
  balanceChange,
  columnScaleMax,
  monthSummary,
  recentTransactions,
  spendingByCategory,
} from "../../lib/overview";
import { fetchTransactions, type Transaction } from "../../lib/transactions";
import { HomeGoalCard } from "./HomeGoalCard";
import { MonthlySummaryCard } from "./MonthlySummaryCard";
import { NetBalanceCard } from "./NetBalanceCard";
import { RECENT_ROWS, RecentActivityCard } from "./RecentActivityCard";
import { SetupBanner, type SetupStep } from "./SetupBanner";
import { TopSpendingCard } from "./TopSpendingCard";
import { CARD_PADDING, DESKTOP, cardLinkSx } from "./layout";

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

type Loaded = { rows: Transaction[]; balance: number; goals: Goal[] };

function Home() {
  const org = useCurrentOrg();
  const categories = useCategories();
  const now = new Date();

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
    Promise.all([
      fetchTransactions(org.id, controller.signal),
      fetchBalance(org.id, controller.signal),
      getGoals(org.id),
    ])
      .then(([rows, balance, goals]) => {
        setData({ rows, balance, goals });
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
        <PageTitle
          title={greeting(now.getHours())}
          subtitle={now.toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        />
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
    px: 2,
    pb: 5,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    [DESKTOP]: { px: 3, gap: 3 },
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

  const { rows, balance, goals } = data;
  const summary = monthSummary(rows, TODAY);
  const scaleMax = columnScaleMax(
    [summary.income, summary.expenses, summary.saved],
    DEFAULT_SCALE_FLOOR,
  );

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
      done: rows.length > 0,
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
        elevation={0}
        sx={[
          cardLinkSx,
          {
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            [DESKTOP]: { flexDirection: "row" },
          },
        ]}
      >
        <Box
          sx={{
            display: "flex",
            p: CARD_PADDING,
            [DESKTOP]: { width: 400, flexShrink: 0 },
          }}
        >
          <NetBalanceCard
            balance={balance}
            change={balanceChange(rows, TODAY)}
            monthStart={`${TODAY.slice(0, 7)}-01`}
          />
        </Box>
        <Box
          aria-hidden
          sx={{
            // The same hairline as the activity rows' dividers.
            borderTop: "1px solid var(--mui-palette-divider)",
            mx: CARD_PADDING,
            [DESKTOP]: {
              borderTop: 0,
              borderLeft: "1px solid var(--mui-palette-divider)",
              mx: 0,
              my: CARD_PADDING,
            },
          }}
        />
        <Box sx={{ display: "flex", flex: 1, minWidth: 0, p: CARD_PADDING }}>
          <MonthlySummaryCard
            summary={summary}
            month={monthName(TODAY)}
            scaleMax={scaleMax}
          />
        </Box>
      </Paper>

      {/* Desktop: activity beside a sidebar whose content sets the row height.
          Phones: one column, with the goal ahead of spending; the sidebar
          dissolves (display: contents) so its cards can take their own order. */}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: "minmax(0, 1fr)",
          [DESKTOP]: {
            gap: 3,
            // The sidebar gives way on narrow desktops so the activity card
            // keeps room for its rows.
            gridTemplateColumns: "minmax(0, 1fr) min(380px, 40%)",
            // Stretched: the sidebar matches the activity card's height, with
            // the spending card absorbing the difference (its ring shrinks).
            alignItems: "stretch",
          },
        }}
      >
        <RecentActivityCard
          rows={recentTransactions(rows, RECENT_ROWS)}
          categories={categories}
          shared={!org.is_personal}
          onAdd={() => setModal("transaction")}
        />
        <Box
          sx={{
            display: "contents",
            [DESKTOP]: {
              display: "flex",
              flexDirection: "column",
              gap: 3,
              minHeight: 0,
            },
          }}
        >
          <Box
            sx={{
              order: 2,
              [DESKTOP]: { order: 0, flex: 1, minHeight: 0, display: "flex" },
            }}
          >
            <TopSpendingCard
              slices={spendingByCategory(rows, TODAY, categories)}
            />
          </Box>
          <Box sx={{ order: 1, [DESKTOP]: { order: 0 } }}>
            <HomeGoalCard goals={goals} onCreateGoal={() => setModal("goal")} />
          </Box>
        </Box>
      </Box>

      {modals}
    </Box>
  );
}

// Named export required by react-router's route-level `lazy`.
export { Home as Component };
