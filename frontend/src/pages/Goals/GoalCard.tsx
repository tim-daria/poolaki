import { useState } from "react";
import { Avatar, Box, IconButton, LinearProgress, Menu, MenuItem, Typography } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import type { Goal } from "../../lib/goals";
import { displayAmount } from "../../lib/money";
import { goalIconMap } from "./goalIcons";
import styles from "./Goals.module.css";

interface Props {
  goal: Goal;
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Card for an active (not yet paid off) goal: icon, saved amount, progress, deadline. */
export function GoalCard({ goal }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const Icon = goalIconMap[goal.icon];
  const pct = Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100));
  const deadline = formatDeadline(goal.target_date);

  return (
    <Box className={styles.card}>
      <Box className={styles.cardTop}>
        <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
          <Icon fontSize="small" />
        </Avatar>
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={() => setAnchorEl(null)}>Contribute</MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Change</MenuItem>
          <MenuItem sx={{ color: "error.main" }} onClick={() => setAnchorEl(null)}>
            Delete
          </MenuItem>
        </Menu>
      </Box>

      <Typography className={styles.cardName}>{goal.name}</Typography>

      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Typography className={styles.cardSaved}>€{displayAmount(goal.saved_amount)}</Typography>
        <Typography className={styles.cardMeta}>of €{displayAmount(goal.target_amount)}</Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 7,
          borderRadius: 999,
          bgcolor: "primary.light",
          "& .MuiLinearProgress-bar": { bgcolor: "primary.dark", borderRadius: 999 },
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography className={styles.cardPct}>{pct}% Completed</Typography>
        {deadline && <Typography className={styles.cardPct}>By {deadline}</Typography>}
      </Box>
    </Box>
  );
}