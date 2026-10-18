/**
 * @file Read-only view of one goal in a side drawer: name and status line,
 * the one figure that matters for its state, a bar, and the activity list.
 * Opens from a goal card; it offers no actions.
 */

import { useEffect, useId, useState } from "react";
import { Box, Drawer, IconButton, Typography } from "@mui/material";
import Close from "@mui/icons-material/Close";
import { GoalActivityList } from "../Goals/GoalActivityList";
import { GoalProgressBar } from "../Goals/GoalProgressBar";
import { Money } from "../Money";
import { useRestoreFocus } from "../../hooks/useRestoreFocus";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import {
  annotate,
  getGoalActivity,
  goalFigures,
  goalSubtitle,
  type SplitEntry,
} from "../../lib/goalActivity";
import { goalBarLook, type Goal } from "../../lib/goals";
import { displayAmount, displayFigure } from "../../lib/money";

interface Props {
  open: boolean;
  /** The goal to show; null keeps the drawer closed. */
  goal: Goal | null;
  onClose: () => void;
}

const WIDTH = 480;

const SPENDING_EMPTY = "Expenses paid from this goal will show up here.";
const SAVING_EMPTY = "Contributions will show up here.";

export function GoalInfoCard({ open, goal, onClose }: Props) {
  const org = useCurrentOrg();
  const titleId = useId();
  const restoreFocus = useRestoreFocus(open);

  /**
   * The goal shown, captured on open. State, not the prop: the page clears
   * its selection as the drawer starts sliding out, which would empty the
   * content mid-animation.
   */
  const [shown, setShown] = useState<Goal | null>(open ? goal : null);
  /** Null while loading. */
  const [rows, setRows] = useState<SplitEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  /** Tracks the open/closed edge, so the block below runs once per opening. */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && goal) {
      setShown(goal);
      setRows(null);
      setFailed(false);
    }
  }

  useEffect(() => {
    if (!shown) return;
    const controller = new AbortController();
    getGoalActivity(org.id, shown.id, controller.signal)
      .then((entries) => setRows(annotate(entries, shown.target_amount)))
      .catch(() => {
        // An abort comes from closing or reopening; anything else is a real failure.
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [org.id, shown]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      // MUI would restore focus before the slide-out ends; handleExited does it.
      disableRestoreFocus
      slotProps={{
        transition: {
          onExited: () => {
            setShown(null);
            setRows(null);
            restoreFocus();
          },
        },
        paper: {
          role: "dialog",
          "aria-labelledby": titleId,
          sx: {
            width: { xs: "100%", sm: WIDTH },
            maxWidth: "100%",
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          },
        },
      }}
    >
      {shown && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                id={titleId}
                component="h2"
                sx={{ fontSize: "1.25rem", fontWeight: 700 }}
              >
                {shown.name}
              </Typography>
              <Subtitle goal={shown} />
            </Box>
            <IconButton
              onClick={onClose}
              aria-label="close"
              sx={{ mt: -1, mr: -1 }}
            >
              <Close />
            </IconButton>
          </Box>
          <Headline goal={shown} />
          <GoalActivityList
            rows={rows ?? []}
            emptyText={shown.spendable ? SPENDING_EMPTY : SAVING_EMPTY}
            loading={rows === null && !failed}
            failed={failed}
          />
        </>
      )}
    </Drawer>
  );
}

function Subtitle({ goal }: { goal: Goal }) {
  const { text, alert } = goalSubtitle(goal);
  return (
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      {text}
      {alert && (
        <>
          {" · "}
          <Box component="span" sx={{ color: "error.main" }}>
            {alert}
          </Box>
        </>
      )}
    </Typography>
  );
}

/**
 * A spendable goal leads with what is left in it and a bar of how much of
 * the savings remain; any other leads with what is saved and the progress
 * to the target, like the card.
 */
function Headline({ goal }: { goal: Goal }) {
  const f = goalFigures(goal);
  const spending = goal.spendable;
  const figure = spending ? goal.balance : f.saved;
  const exact = `${figure < 0 ? "-" : ""}€${displayAmount(Math.abs(figure))}`;
  const look = spending
    ? {
        pct: f.leftShare,
        barValue: f.leftShare,
        track: "primary.light",
        fill: "primary.dark",
      }
    : goalBarLook(goal);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography
        component="p"
        sx={{ display: "flex", alignItems: "baseline", gap: 1 }}
      >
        {/* Whole euros on screen; the exact amount in the title and the accessible name. */}
        <Money
          title={exact}
          aria-label={exact}
          sx={{
            fontSize: "2rem",
            fontWeight: 400,
            color: figure < 0 ? "error.main" : "text.primary",
          }}
        >
          {figure < 0 && "-"}€{displayFigure(Math.abs(figure))}
        </Money>
        <Box component="span" sx={{ color: "text.secondary" }}>
          {spending
            ? "left in goal"
            : `of €${displayFigure(goal.target_amount)}`}
        </Box>
      </Typography>
      <GoalProgressBar look={look} />
      {spending ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          €{displayFigure(f.saved)} saved · €{displayFigure(f.spent)} spent
        </Typography>
      ) : (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">{f.pct}%</Typography>
          <Typography variant="body2">
            {f.toGo > 0 ? `€${displayFigure(f.toGo)} to go` : "Target reached"}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
