/** @file A goal's progress bar, shared by the card and the info view; the caller decides what it measures. */

import { LinearProgress } from "@mui/material";
import type { BarLook } from "../../lib/goals";

export function GoalProgressBar({ look }: { look: BarLook }) {
  return (
    <LinearProgress
      variant="determinate"
      value={look.barValue}
      // The drawn bar restarts past 100% (see goalBarLook); tell assistive
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
  );
}
