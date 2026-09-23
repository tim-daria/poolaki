/** @file Goals page: every goal as a card in a foldable Active, Completed or Archived section; the add modal and the Contribute modal are wired. */

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { GoalForm } from "../../components/Modals/GoalForm";
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

/** One section per state, in page order; Archived starts folded. */
const SECTIONS: { state: GoalStatus; title: string; defaultOpen: boolean }[] = [
  { state: "active", title: "Active", defaultOpen: true },
  { state: "completed", title: "Completed", defaultOpen: true },
  { state: "archived", title: "Archived", defaultOpen: false },
];

function Goals() {
  const org = useCurrentOrg();
  const [adding, setAdding] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  /** The goal a Contribute click targets; null keeps the transaction modal closed. */
  const [contributeTo, setContributeTo] = useState<Goal | null>(null);

  useEffect(() => {
    getGoals(org.id).then(setGoals);
  }, [org.id]);

  const ordered = [...goals].sort(oldestFirst);

  return (
    <Box
      sx={{ px: 3, pb: 5, display: "flex", flexDirection: "column", gap: 3 }}
    >
      <PageTitle />
      <PageActionButton onClick={() => setAdding(true)}>
        Add saving
      </PageActionButton>
      <GoalForm open={adding} onClose={() => setAdding(false)} />
      {/* No onSaved: saved_amount comes from the seed until the API lands, so
          there is nothing to refresh yet. No onInfo on the cards either: the
          Info view is not built, so archived cards are inert on click. */}
      <TransactionForm
        open={contributeTo !== null}
        onClose={() => setContributeTo(null)}
        goal={contributeTo?.id}
      />
      {SECTIONS.map(({ state, title, defaultOpen }) => (
        <GoalSection
          key={state}
          title={title}
          ariaLabel={`${title} goals`}
          defaultOpen={defaultOpen}
        >
          {ordered
            .filter((g) => goalState(g) === state)
            .map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onContribute={() => setContributeTo(g)}
              />
            ))}
        </GoalSection>
      ))}
    </Box>
  );
}

// Named alias for react-router's route-level `lazy`
export { Goals as Component };
