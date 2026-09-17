/** @file Goals page. Placeholder body until the goals API lands; the add modal is wired. */

import { useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  PageActionButton,
  PageTitle,
} from "../../components/PageHeader/PageHeader";
import { GoalForm } from "../../components/Modals/GoalForm";
import { useCurrentOrg } from "../../context/useCurrentOrg";

function Goals() {
  const org = useCurrentOrg();
  const [adding, setAdding] = useState(false);

  return (
    <Box
      sx={{ px: 3, pb: 5, display: "flex", flexDirection: "column", gap: 3 }}
    >
      <PageTitle />
      <PageActionButton onClick={() => setAdding(true)}>
        Add goal
      </PageActionButton>
      <GoalForm open={adding} onClose={() => setAdding(false)} />
      <Typography>{org.name}'s Goals Page</Typography>
      Page is under construction
    </Box>
  );
}

// Named alias for react-router's route-level `lazy`
export { Goals as Component };
