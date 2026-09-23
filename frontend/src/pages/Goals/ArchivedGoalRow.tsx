/** @file Compact row for an archived goal: name and final saved/target amounts. */

import { Box, Paper, Typography } from "@mui/material";
import type { Goal } from "../../lib/goals";
import { displayAmount } from "../../lib/money";

/** Row for an archived goal. Dimmed: it is no longer being saved for. */
export function ArchivedGoalRow({ goal }: { goal: Goal }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderRadius: 3,
        // Dimmed so an archived goal does not read as one still in progress.
        color: "text.disabled",
      }}
    >
      <Typography sx={{ fontWeight: 700, flex: 1 }}>{goal.name}</Typography>
      <Box sx={{ textAlign: "right" }}>
        <Typography sx={{ fontWeight: 700 }}>
          €{displayAmount(goal.saved_amount)} of €
          {displayAmount(goal.target_amount)}
        </Typography>
      </Box>
    </Paper>
  );
}
