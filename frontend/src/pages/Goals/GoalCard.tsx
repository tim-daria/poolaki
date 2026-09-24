/** @file Clickable card for a goal in any state: avatar, flags, saved/target, progress bar, deadline; actions menu unless archived. */

import { useState, type KeyboardEvent, type MouseEvent } from "react";
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
import { cardFrameSx } from "./styles";

interface Props {
  goal: Goal;
  onContribute: () => void;
  /** Opens the goal's details. Optional until the Info view exists. */
  onInfo?: () => void;
}

/** Chip text per flag. Exhaustive: a flag without a label fails to compile. */
const FLAG_LABEL: Record<GoalFlag, string> = {
  overdue: "Overdue",
};

/** Tinted like TransactionRow's chips: pale background, strong text. */
const FLAG_CHIP = { bgcolor: "error.light", color: "error.main" };
const FLAG_CHIP_DIMMED = { bgcolor: "action.selected", color: "text.disabled" };

/** What differs per state, decided once so the markup below has no branches. */
function cardLook(goal: Goal) {
  const state = goalState(goal);
  const deadline = goal.target_date
    ? `By ${monthYear(goal.target_date)}`
    : null;
  // Unclamped: a goal can be saved past its target, and the label says so.
  const pct =
    goal.target_amount === 0
      ? 0
      : Math.round((goal.saved_amount / goal.target_amount) * 100);
  switch (state) {
    case "archived":
      return {
        state,
        pct,
        barValue: Math.min(100, pct),
        deadline,
        deadlineColor: "text.secondary",
        // Flags persist after archiving but go grey with the rest of the card.
        flags: goalFlags(goal),
        chipSx: FLAG_CHIP_DIMMED,
        // Dimmed, bar included: a full primary bar would read as "in progress".
        text: "text.disabled",
        track: "action.disabledBackground",
        fill: "text.disabled",
        actions: false,
      };
    case "completed":
      return {
        state,
        pct,
        // Exactly on target: a full bar. Past it, the light track stands for
        // the planned 100% and the bar draws only the excess, as if filling
        // again — 120% shows a 20% bar.
        barValue: pct === 100 ? 100 : Math.min(100, pct - 100),
        deadline,
        deadlineColor: "text.secondary",
        flags: goalFlags(goal),
        chipSx: FLAG_CHIP,
        text: undefined,
        track: "success.light",
        fill: "success.main",
        actions: true,
      };
    case "active": {
      const flags = goalFlags(goal);
      return {
        state,
        pct,
        barValue: Math.min(100, pct),
        deadline,
        // The deadline itself turns red; the chip says why.
        deadlineColor: flags.includes("overdue")
          ? "error.main"
          : "text.secondary",
        flags,
        chipSx: FLAG_CHIP,
        text: undefined,
        track: "primary.light",
        fill: "primary.dark",
        actions: true,
      };
    }
  }
}

/**
 * Card for a goal in any state; completion and flags are derived from the
 * amounts and dates. The whole card is a control: it opens Contribute where the
 * actions menu would, and the Info view (not built yet) otherwise.
 */
export function GoalCard({ goal, onContribute, onInfo }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const look = cardLook(goal);
  const open = look.actions ? onContribute : onInfo;

  // The menu button lives inside the clickable card, so its click and its
  // Enter keypress must not reach the card's handlers.
  function openMenu(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }
  function stopKeys(e: KeyboardEvent<HTMLElement>) {
    e.stopPropagation();
  }

  return (
    <>
      <Paper
        variant="outlined"
        role="group"
        aria-label={goal.name}
        tabIndex={0}
        onClick={open}
        // Enter and Space, the two keys that activate a button.
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          open?.();
        }}
        sx={[cardFrameSx, { color: look.text }]}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <GoalStatusAvatar status={look.state} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {look.flags.map((f) => (
              <Chip
                key={f}
                label={FLAG_LABEL[f]}
                size="small"
                sx={{ ...look.chipSx, fontWeight: 500 }}
              />
            ))}
            {look.actions && (
              <IconButton
                size="small"
                aria-label={`Actions for ${goal.name}`}
                onClick={openMenu}
                onKeyDown={stopKeys}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
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
          {/* sx, not the color prop: MUI 9's Typography resolves only named
              colours ("error", "textSecondary") through the prop, not palette
              paths like "text.secondary". */}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            of €{displayAmount(goal.target_amount)}{" "}
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={look.barValue}
          // The drawn bar restarts past 100% (see cardLook); tell assistive
          // tech the real figure.
          aria-valuenow={look.pct}
          aria-valuemax={Math.max(100, look.pct)}
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
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {look.pct}% Completed
          </Typography>
          {look.deadline && (
            <Typography variant="body2" sx={{ color: look.deadlineColor }}>
              {look.deadline}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* A sibling, not a child, of the Paper: React events bubble through
          portals along the component tree, so a Menu inside the card would
          forward its item clicks, its backdrop click and Enter to the card's
          handlers and open Contribute by accident. */}
      {look.actions && (
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
      )}
    </>
  );
}
