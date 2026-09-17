import { Avatar, Box, Chip, Typography } from "@mui/material";
import type { Goal } from "../../lib/goals";
import { displayAmount } from "../../lib/money";
import { goalIconMap } from "./goalIcons";
import styles from "./Goals.module.css";

/** Row for a paid-off goal — the only archived state the backend will have. */
export function ArchivedGoalRow({ goal }: { goal: Goal }) {
  const Icon = goalIconMap[goal.icon];

  return (
    <Box className={styles.card} sx={{ flexDirection: "row", alignItems: "center", gap: 1.5 }}>
      <Avatar sx={{ bgcolor: "action.disabledBackground", color: "text.secondary" }}>
        <Icon fontSize="small" />
      </Avatar>
      <Typography className={styles.cardName} sx={{ flex: 1, color: "text.primary" }}>
        {goal.name}
      </Typography>
      <Box sx={{ textAlign: "right" }}>
        <Typography className={styles.cardSaved}>€{displayAmount(goal.saved_amount)}</Typography>
        <Chip label="PAID OFF" size="small" sx={{ mt: 0.3 }} />
      </Box>
    </Box>
  );
}