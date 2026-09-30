/** @file Clickable card for a goal in any state: avatar, flags, saved/target, progress bar, deadline; actions menu unless archived. */

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";
import {
  FLAG_LABEL,
  goalBarLook,
  goalFlags,
  goalHint,
  goalState,
  type Goal,
} from "../../lib/goals";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { displayAmount } from "../../lib/money";
import { monthYear } from "../../lib/date";
import { GoalProgressBar } from "../../components/Goals/GoalProgressBar";
import { GoalStatusAvatar } from "./GoalStatusAvatar";

interface Props {
  goal: Goal;
  onContribute: () => void;
  /** Opens the goal's info card. */
  onInfo: () => void;
}

/** Tinted like TransactionRow's chips: pale background, strong text. */
const FLAG_CHIP = { bgcolor: "error.light", color: "error.main" };
const FLAG_CHIP_DIMMED = { bgcolor: "action.selected", color: "text.disabled" };

/** What differs per state, decided once so the markup below has no branches. The bar is goalBarLook's. */
function cardLook(goal: Goal) {
  const state = goalState(goal);
  const deadline = goal.target_date
    ? `By ${monthYear(goal.target_date)}`
    : null;
  // Unclamped: a goal can be saved past its target, and the label says so.
  const { pct } = goalBarLook(goal);
  switch (state) {
    case "archived":
      return {
        state,
        pct,
        deadline,
        deadlineColor: "text.secondary",
        // Flags persist after archiving but go grey with the rest of the card.
        flags: goalFlags(goal),
        chipSx: FLAG_CHIP_DIMMED,
        text: "text.disabled",
        actions: false,
      };
    case "completed":
      return {
        state,
        pct,
        deadline,
        deadlineColor: "text.secondary",
        flags: goalFlags(goal),
        chipSx: FLAG_CHIP,
        text: undefined,
        actions: true,
      };
    case "active": {
      const flags = goalFlags(goal);
      return {
        state,
        pct,
        deadline,
        // The deadline itself turns red; the chip says why.
        deadlineColor: flags.includes("overdue")
          ? "error.main"
          : "text.secondary",
        flags,
        chipSx: FLAG_CHIP,
        text: undefined,
        actions: true,
      };
    }
  }
}

/**
 * Card for a goal in any state; the state is the wire's, the flags are derived
 * from the amounts and dates. The whole card is a control: it opens Contribute
 * where the actions menu would, and the info card otherwise.
 */
export function GoalCard({ goal, onContribute, onInfo }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const look = cardLook(goal);
  const hint = goalHint(goal);
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
        variant="clickableCard"
        role="group"
        aria-label={goal.name}
        tabIndex={0}
        onClick={open}
        // Enter and Space, the two keys that activate a button.
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          open();
        }}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
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

        <GoalProgressBar look={goalBarLook(goal)} />
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
        {hint && (
          <Typography variant="body2" sx={{ color: "primary.dark" }}>
            {hint}
          </Typography>
        )}
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
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onInfo();
            }}
          >
            Show Info
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Edit</MenuItem>
        </Menu>
      )}
    </>
  );
}
