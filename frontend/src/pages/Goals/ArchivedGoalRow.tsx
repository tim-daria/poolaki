import { Avatar, Box, Chip, Paper, Typography } from "@mui/material";
import type { Goal } from "../../lib/goals";
import { displayAmount } from "../../lib/money";
import { goalIconMap } from "./goalIcons";

/** Row for a paid-off goal — the only archived state the backend will have. */
export function ArchivedGoalRow({ goal }: { goal: Goal }) {
  const Icon = goalIconMap[goal.icon];

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, borderRadius: 3 }}
    >
      <Avatar sx={{ bgcolor: "action.disabledBackground", color: "text.secondary" }}>
        <Icon fontSize="small" />
      </Avatar>
      <Typography sx={{ fontWeight: 700, flex: 1 }}>{goal.name}</Typography>
      <Box sx={{ textAlign: "right" }}>
        <Typography sx={{ fontWeight: 700 }}>€{displayAmount(goal.saved_amount)}</Typography>
        <Chip label="PAID OFF" size="small" sx={{ mt: 0.3 }} />
      </Box>
    </Paper>
  );
}