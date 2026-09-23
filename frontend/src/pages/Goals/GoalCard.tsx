/** @file Card for a goal in any state: avatar, flags, saved/target, progress bar, deadline; actions menu unless archived. */

import { useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";
import {
  goalFlags,
  goalState,
  type Goal,
  type GoalFlag,
} from "../../lib/goals";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { displayAmount } from "../../lib/money";
import { monthYear } from "../../lib/date";
import { GoalStatusAvatar } from "./GoalStatusAvatar";

interface Props {
  goal: Goal;
  onContribute: () => void;
}

/** Chip text per flag. Exhaustive: a flag without a label fails to compile. */
const FLAG_LABEL: Record<GoalFlag, string> = {
  overdue: "Overdue",
};

/** What differs per state, decided once so the markup below has no branches. */
function cardLook(goal: Goal) {
  const state = goalState(goal);
  const deadline = goal.target_date
    ? `By ${monthYear(goal.target_date)}`
    : null;
  switch (state) {
    case "archived":
      return {
        state,
        deadline,
        deadlineColor: "text.secondary",
        // Flags persist after archiving but go grey with the rest of the card.
        flags: goalFlags(goal),
        chipColor: "default" as const,
        // Dimmed, bar included: a full primary bar would read as "in progress".
        text: "text.disabled",
        track: "action.disabledBackground",
        fill: "text.disabled",
        actions: false,
      };
    case "completed":
      return {
        state,
        deadline,
        deadlineColor: "text.secondary",
        flags: goalFlags(goal),
        chipColor: "error" as const,
        text: undefined,
        track: "success.light",
        fill: "success.main",
        actions: true,
      };
    case "active": {
      const flags = goalFlags(goal);
      return {
        state,
        deadline,
        // The deadline itself turns red; the chip says why.
        deadlineColor: flags.includes("overdue")
          ? "error.main"
          : "text.secondary",
        flags,
        chipColor: "error" as const,
        text: undefined,
        track: "primary.light",
        fill: "primary.dark",
        actions: true,
      };
    }
  }
}

/** Card for a goal in any state; completion and flags are derived from the amounts and dates. */
export function GoalCard({ goal, onContribute }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const look = cardLook(goal);
  const pct = Math.min(
    100,
    goal.target_amount === 0
      ? 0
      : Math.round((goal.saved_amount / goal.target_amount) * 100),
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        borderRadius: 3,
        color: look.text,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GoalStatusAvatar status={look.state} />
          {look.flags.map((f) => (
            <Chip
              key={f}
              label={FLAG_LABEL[f]}
              size="small"
              color={look.chipColor}
            />
          ))}
        </Box>
        {look.actions && (
          <>
            <IconButton
              size="small"
              aria-label={`Actions for ${goal.name}`}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={!!anchorEl}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  onContribute();
                }}
              >
                Contribute
              </MenuItem>
              <MenuItem onClick={() => setAnchorEl(null)}>Show Info</MenuItem>
              <MenuItem onClick={() => setAnchorEl(null)}>Edit</MenuItem>
            </Menu>
          </>
        )}
      </Box>

      <Typography sx={{ fontWeight: 700 }}>{goal.name}</Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
          €{displayAmount(goal.saved_amount)}{" "}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          of €{displayAmount(goal.target_amount)}{" "}
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 7,
          borderRadius: 999,
          bgcolor: look.track,
          "& .MuiLinearProgress-bar": {
            bgcolor: look.fill,
            borderRadius: 999,
          },
        }}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          {pct}% Completed
        </Typography>
        {look.deadline && (
          // sx, not the color prop: MUI 9's Typography resolves only named
          // colours ("error", "textSecondary") through the prop, not palette
          // paths like "error.main".
          <Typography variant="body2" sx={{ color: look.deadlineColor }}>
            {look.deadline}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
