/** @file Goals page: every goal as a card in a foldable Active, Completed or Archived section; the add/edit, Contribute and info modals are wired. */

import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { GoalForm } from "../../components/Modals/GoalForm";
import { GoalInfoCard } from "../../components/Modals/GoalInfoCard";
import { TransactionForm } from "../../components/Modals/TransactionForm";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import {
  getGoals,
  goalState,
  oldestFirst,
  type Goal,
  type GoalStatus,
} from "../../lib/goals";
import { GoalCard } from "./GoalCard";
import { GoalSection } from "./GoalSection";
import { NewGoalCard } from "./NewGoalCard";
import { useAuth } from "../../context/useAuth";
import { canEditGoal } from "../../lib/access";

/** One section per state, in page order; Archived starts folded. */
const SECTIONS: { state: GoalStatus; title: string; defaultOpen: boolean }[] = [
  { state: "active", title: "Active", defaultOpen: true },
  { state: "completed", title: "Completed", defaultOpen: true },
  { state: "archived", title: "Archived", defaultOpen: false },
];

function Goals() {
  const org = useCurrentOrg();
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Bumped after a save, so the cards refetch. */
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  /** The goal open in the edit form; null means the form adds. */
  const [editing, setEditing] = useState<Goal | null>(null);
  /** The goal a transfer targets and which way; null keeps the transaction modal closed. */
  const [transfer, setTransfer] = useState<{
    goal: Goal;
    direction: "contribution" | "withdraw";
  } | null>(null);
  /** The goal whose info card is open; null keeps it closed. */
  const [infoFor, setInfoFor] = useState<Goal | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getGoals(org.id, controller.signal)
      .then((loaded) => {
        setGoals(loaded);
        setError(null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load goals");
      });
    return () => controller.abort();
  }, [org.id, version]);

  const refresh = () => setVersion((v) => v + 1);

  const ordered = [...(goals ?? [])].sort(oldestFirst);

  return (
    <Box
      sx={{ px: 3, pb: 5, display: "flex", flexDirection: "column", gap: 3 }}
    >
      <PageTitle />
      <PageActionButton onClick={() => setAdding(true)}>
        Add saving
      </PageActionButton>
      {error && <Alert severity="error">{error}</Alert>}
      <GoalForm
        open={adding || editing !== null}
        goal={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={refresh}
      />
      <TransactionForm
        open={transfer !== null}
        direction={transfer?.direction}
        onClose={() => setTransfer(null)}
        goal={transfer?.goal.id}
        onSaved={refresh}
      />
      <GoalInfoCard
        open={infoFor !== null}
        goal={infoFor}
        onClose={() => setInfoFor(null)}
      />
      {goals === null ? (
        <CircularProgress />
      ) : (
        SECTIONS.map(({ state, title, defaultOpen }) => {
          const cards = ordered
            .filter((g) => goalState(g) === state)
            .map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                canEdit={canEditGoal(g, user?.username, org.role)}
                onContribute={() =>
                  setTransfer({ goal: g, direction: "contribution" })
                }
                onWithdraw={() =>
                  setTransfer({ goal: g, direction: "withdraw" })
                }
                onInfo={() => setInfoFor(g)}
                onEdit={() => setEditing(g)}
              />
            ));
          return (
            <GoalSection
              key={state}
              title={title}
              ariaLabel={`${title} goals`}
              defaultOpen={defaultOpen}
            >
              {cards}
              {/* Nothing in progress: prompt for one where the first card would sit. */}
              {state === "active" && cards.length === 0 && (
                <NewGoalCard onClick={() => setAdding(true)} />
              )}
            </GoalSection>
          );
        })
      )}
    </Box>
  );
}

// Named alias for react-router's route-level `lazy`
export { Goals as Component };
