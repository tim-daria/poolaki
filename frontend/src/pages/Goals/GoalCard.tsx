/** @file Clickable card for a goal in any state: avatar, flags, saved/target, progress bar, deadline or overdraft, what an archived goal held; actions menu per state. */

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  FLAG_LABEL,
  goalBarLook,
  goalFlags,
  isOffLimits,
  overBy,
  targetReachedCue,
  goalState,
  type Goal,
} from "../../lib/goals";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { displayAmount } from "../../lib/money";
import { monthYear } from "../../lib/date";
import { GoalProgressBar } from "../../components/Goals/GoalProgressBar";
import { GoalStatusAvatar } from "./GoalStatusAvatar";
import { useHeldAtArchive } from "../../hooks/useHeldAtArchive";

interface Props {
  goal: Goal;
  onContribute: () => void;
  /** Opens the goal's info card. */
  onInfo: () => void;
  /** Opens the goal in the edit form. */
  onEdit: () => void;
  /** Opens the transaction form on Withdraw for this goal. */
  onWithdraw: () => void;
}

/** Tinted like TransactionRow's chips: pale background, strong text. */
const FLAG_CHIP = { bgcolor: "error.light", color: "error.main" };
const FLAG_CHIP_DIMMED = { bgcolor: "action.selected", color: "text.disabled" };

/**
 * What differs per state, decided once so the markup below has no branches.
 * The bar is goalBarLook's; the percent is clamped at 0 there, and an
 * overdraft states its amount instead.
 */
function cardLook(goal: Goal) {
  const state = goalState(goal);
  const { pct } = goalBarLook(goal);
  const offLimits = isOffLimits(goal);
  const deadline = goal.target_date
    ? `By ${monthYear(goal.target_date)}`
    : null;

  // The text at the bar's right end. Off limits takes that spot from the
  // deadline: the overdraft is the one thing to act on.
  const trailing = offLimits
    ? { text: `Over by €${displayAmount(overBy(goal))}`, color: "error.main" }
    : deadline
      ? { text: deadline, color: "text.secondary" }
      : null;

  switch (state) {
    case "archived":
      return {
        state,
        pct,
        offLimits,
        trailing,
        // Flags persist after archiving but go grey with the rest of the card.
        flags: goalFlags(goal),
        chipSx: FLAG_CHIP_DIMMED,
        text: "text.disabled",
        actions: false,
        openAction: "info" as const,
      };
    case "completed":
      return {
        state,
        pct,
        offLimits,
        trailing,
        flags: goalFlags(goal),
        chipSx: FLAG_CHIP,
        text: undefined,
        actions: true,
        openAction: "edit" as const,
      };
    case "active": {
      const flags = goalFlags(goal);
      return {
        state,
        pct,
        offLimits,
        // Past the deadline, the deadline itself turns red; the chip says why.
        trailing:
          trailing && flags.includes("overdue")
            ? { ...trailing, color: "error.main" }
            : trailing,
        flags,
        chipSx: FLAG_CHIP,
        text: undefined,
        actions: true,
        openAction: "contribute" as const,
      };
    }
  }
}

/**
 * Card for a goal in any state; the state is the wire's, the flags are derived
 * from the amounts and dates. The whole card is a control:
 * it opens Contribute on an active goal, Edit on a completed one, and the info card on an archived one.
 */
export function GoalCard({
  goal,
  onContribute,
  onInfo,
  onEdit,
  onWithdraw,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const look = cardLook(goal);
  // Archived cards show what was held, not the settled zero the server reports.
  const archived = look.state === "archived";
  const held = useHeldAtArchive(goal);
  const shownBalance = archived ? held : goal.balance;
  const bar =
    archived && typeof held === "number"
      ? goalBarLook({ ...goal, balance: held })
      : goalBarLook(goal);
  // A settled overdraft reads with a minus but not in red: nothing is owed any more.
  const negative = look.offLimits || (typeof held === "number" && held < 0);
  const hint = targetReachedCue(goal);
  const open = { contribute: onContribute, edit: onEdit, info: onInfo }[
    look.openAction
  ];

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
            {hint && (
              <Tooltip title={hint} arrow>
                <Chip
                  label="Target reached"
                  size="small"
                  clickable
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  onKeyDown={stopKeys}
                  sx={{
                    bgcolor: "success.light",
                    color: "success.main",
                    fontWeight: 500,
                  }}
                />
              </Tooltip>
            )}
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
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "1.15rem",
              // color: look.offLimits ? "error.main" : undefined,
            }}
          >
            {shownBalance === undefined
              ? "€—"
              : `${negative ? "−" : ""}€${displayAmount(Math.abs(shownBalance ?? 0))}`}{" "}
          </Typography>
          {/* sx, not the color prop: MUI 9's Typography resolves only named
              colours ("error", "textSecondary") through the prop, not palette
              paths like "text.secondary". */}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            of €{displayAmount(goal.target_amount)}{" "}
          </Typography>
        </Box>

        <GoalProgressBar look={bar} />
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {bar.pct}% Completed
          </Typography>
          {look.trailing && (
            <Typography variant="body2" sx={{ color: look.trailing.color }}>
              {look.trailing.text}
            </Typography>
          )}
        </Box>
        {typeof held === "number" && (
          <Typography variant="body2" sx={{ color: "text.disabled" }}>
            {held >= 0
              ? `Returned €${displayAmount(held)} to balance`
              : `Settled €${displayAmount(-held)} from balance`}
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
          {look.openAction === "contribute" && (
            <>
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
                  onWithdraw();
                }}
              >
                Withdraw
              </MenuItem>
            </>
          )}
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onInfo();
            }}
          >
            Show Info
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onEdit();
            }}
          >
            Edit
          </MenuItem>
        </Menu>
      )}
    </>
  );
}
