/**
 * @file Workspace landing page: greeting or member list, a setup checklist for
 * new workspaces, and the overview cards.
 */

import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
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
import { SEED_GOALS } from "../../lib/goals.seed";
import {
  closestGoal,
  daysLeftInMonth,
  monthSummary,
  recentTransactions,
  spendingByCategory,
} from "../../lib/overview";
import { fetchTransactions, type Transaction } from "../../lib/transactions";
import { ClosestGoalCard } from "./ClosestGoalCard";
import { MonthlySummaryCard } from "./MonthlySummaryCard";
import { NetBalanceCard } from "./NetBalanceCard";
import { RecentActivityCard } from "./RecentActivityCard";
import { SetupBanner, type SetupStep } from "./SetupBanner";
import { SpendingCard } from "./SpendingCard";

const RECENT_LIMIT = 6;

/** TODO: seeded like the transaction form's goal picker until a goals API exists. */
const GOALS = SEED_GOALS;

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

function Home() {
  const org = useCurrentOrg();
  const categories = useCategories();
  const now = new Date();

  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumped after a save or delete, since either moves the balance. */
  const [version, setVersion] = useState(0);

  const [modal, setModal] = useState<Modal>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
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
    ])
      .then(([transactions, total]) => {
        setRows(transactions);
        setBalance(total);
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
        open={modal === "transaction" || editing !== null}
        transaction={editing ?? undefined}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
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

  if (rows === null || balance === null) {
    return (
      <Box sx={{ px: 3, pb: 5 }}>
        {header}
        {error ? <Alert severity="error">{error}</Alert> : <CircularProgress />}
        {modals}
      </Box>
    );
  }

  const month = monthName(TODAY);
  const goal = closestGoal(GOALS);

  // Only the personal workspace has a starting-balance endpoint; a shared one
  // sets its balance when it is created.
  const steps: SetupStep[] = [
    ...(org.is_personal
      ? [
          {
            label: "Set starting balance",
            done: balance !== 0,
            onClick: () => setModal("balance"),
          },
        ]
      : []),
    {
      label: "Add your first transaction",
      done: rows.length > 0,
      onClick: () => setModal("transaction"),
    },
    {
      label: "Create a savings goal",
      done: GOALS.length > 0,
      onClick: () => setModal("goal"),
    },
  ];
  const showSetup = !setupDismissed && steps.some((s) => !s.done);

  return (
    <Box
      sx={{ px: 3, pb: 5, display: "flex", flexDirection: "column", gap: 3 }}
    >
      {header}

      {error && <Alert severity="error">{error}</Alert>}

      {showSetup && <SetupBanner steps={steps} onDismiss={dismissSetup} />}

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        <NetBalanceCard
          balance={balance}
          isPersonal={org.is_personal}
          onSetStartingBalance={() => setModal("balance")}
          onAddIncome={() => setModal("transaction")}
        />
        <MonthlySummaryCard
          summary={monthSummary(rows, TODAY)}
          month={month}
          daysLeft={daysLeftInMonth(TODAY)}
        />
        <ClosestGoalCard goal={goal} onCreateGoal={() => setModal("goal")} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 3fr) minmax(0, 2fr)",
          },
        }}
      >
        <RecentActivityCard
          rows={recentTransactions(rows, RECENT_LIMIT)}
          categories={categories}
          shared={!org.is_personal}
          onOpen={setEditing}
          onAdd={() => setModal("transaction")}
        />
        <SpendingCard
          slices={spendingByCategory(rows, TODAY, categories)}
          month={month}
        />
      </Box>

      {modals}
    </Box>
  );
}

// Named export required by react-router's route-level `lazy`.
export { Home as Component };
