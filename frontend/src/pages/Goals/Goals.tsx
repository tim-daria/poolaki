/** @file Goals page: every goal as a card, split into Active and Archived; the add modal and the Contribute modal are wired. */

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { GoalForm } from "../../components/Modals/GoalForm";
import { TransactionForm } from "../../components/Modals/TransactionForm";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { getGoals, isArchived, type Goal } from "../../lib/goals";
import { GoalCard } from "./GoalCard";

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(300px, 1fr))",
  gap: 2,
} as const;

function Goals() {
  const org = useCurrentOrg();
  const [adding, setAdding] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  /** The goal a Contribute click targets; null keeps the transaction modal closed. */
  const [contributeTo, setContributeTo] = useState<Goal | null>(null);

  useEffect(() => {
    getGoals(org.id).then(setGoals);
  }, [org.id]);

  const active = goals.filter((g) => !isArchived(g));
  const archived = goals.filter(isArchived);

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
          there is nothing to refresh yet. */}
      <TransactionForm
        open={contributeTo !== null}
        onClose={() => setContributeTo(null)}
        goal={contributeTo?.id}
      />
      <Typography variant="overline" color="text.secondary">
        Active
      </Typography>
      <Box component="section" aria-label="Active goals" sx={cardGrid}>
        {active.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onContribute={() => setContributeTo(g)}
          />
        ))}
      </Box>
      <Typography variant="overline" color="text.secondary">
        Archived
      </Typography>
      <Box component="section" aria-label="Archived goals" sx={cardGrid}>
        {archived.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onContribute={() => setContributeTo(g)}
          />
        ))}
      </Box>
    </Box>
  );
}

// Named alias for react-router's route-level `lazy`
export { Goals as Component };
