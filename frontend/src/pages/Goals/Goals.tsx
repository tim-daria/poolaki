/** @file Goals page: non-archived goals as progress cards, archived ones as rows; the add modal is wired. */

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { GoalForm } from "../../components/Modals/GoalForm";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { getGoals, isArchived, type Goal } from "../../lib/goals";
import { GoalCard } from "./GoalCard";
import { ArchivedGoalRow } from "./ArchivedGoalRow";

function Goals() {
  const org = useCurrentOrg();
  const [adding, setAdding] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

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
      <Typography variant="overline" color="text.secondary">
        Active
      </Typography>
      <Box
        component="section"
        aria-label="Active goals"
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 2,
        }}
      >
        {active.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </Box>
      <Typography variant="overline" color="text.secondary">
        Archived
      </Typography>
      <Box
        component="section"
        aria-label="Archived goals"
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 1,
        }}
      >
        {archived.map((g) => (
          <ArchivedGoalRow key={g.id} goal={g} />
        ))}
      </Box>
    </Box>
  );
}

// Named alias for react-router's route-level `lazy`
export { Goals as Component };
