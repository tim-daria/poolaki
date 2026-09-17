/** @file Goals page. Placeholder body until the goals API lands; the add modal is wired. */

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { GoalForm } from "../../components/Modals/GoalForm";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { getGoals, type Goal } from "../../lib/goals";
import { GoalCard } from "./GoalCard";
import { ArchivedGoalRow } from "./ArchivedGoalRow";
import styles from "./Goals.module.css";

function Goals() {
  const org = useCurrentOrg();
  const [adding, setAdding] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

    useEffect(() => {
    getGoals(org.id).then(setGoals);
  }, [org.id]);

  const active = goals.filter((g) => !g.paid_off);
  const archived = goals.filter((g) => g.paid_off); 

  return (
    <Box
      sx={{ px: 3, pb: 5, display: "flex", flexDirection: "column", gap: 3 }}
    >
      <PageTitle />
      <PageActionButton onClick={() => setAdding(true)}>
        Add goal
      </PageActionButton>
      <GoalForm open={adding} onClose={() => setAdding(false)} />
      <Typography className={styles.sectionLabel}>IN PROGRESS</Typography>
      <Box className={styles.cardGrid}>
        {active.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </Box>
      <Typography className={styles.sectionLabel}>ARCHIVED</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {archived.map((g) => (
            <ArchivedGoalRow key={g.id} goal={g} />
            ))}
        </Box>
    </Box>
  );
}

// Named alias for react-router's route-level `lazy`
export { Goals as Component };
