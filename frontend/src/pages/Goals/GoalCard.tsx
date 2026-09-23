/** @file Card for a non-archived goal: saved amount, progress bar, deadline and a row-actions menu. */

import { useState } from "react";
import {
  Box,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import type { Goal } from "../../lib/goals";
import { displayAmount } from "../../lib/money";

interface Props {
  goal: Goal;
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/** Card for a non-archived goal; a completed one shows at 100% until it is archived. */
export function GoalCard({ goal }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const pct = Math.min(
    100,
    Math.round((goal.saved_amount / goal.target_amount) * 100),
  );
  const deadline = formatDeadline(goal.target_date);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          // Only the actions button lives in this row; keep it on the right.
          justifyContent: "flex-end",
          alignItems: "flex-start",
        }}
      >
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={!!anchorEl}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => setAnchorEl(null)}>Contribute</MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>Change</MenuItem>
          <MenuItem
            sx={{ color: "error.main" }}
            onClick={() => setAnchorEl(null)}
          >
            Delete
          </MenuItem>
        </Menu>
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
          bgcolor: "primary.light",
          "& .MuiLinearProgress-bar": {
            bgcolor: "primary.dark",
            borderRadius: 999,
          },
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          {pct}% Completed
        </Typography>
        {deadline && (
          <Typography variant="body2" color="text.secondary">
            By {deadline}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
