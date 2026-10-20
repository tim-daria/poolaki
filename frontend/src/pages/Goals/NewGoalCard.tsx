/** @file Placeholder card shown when nothing is being saved for: a dashed frame that opens the add form. */

import { ButtonBase, Paper, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";

interface Props {
  onClick: () => void;
}

/**
 * Same frame as a GoalCard so the grid keeps its rhythm; dashed to read as
 * "not a goal yet". A real button: it holds no other control, so the
 * element can carry the role, the keyboard handling and the focus ring
 * itself. Its text is its accessible name.
 */
export function NewGoalCard({ onClick }: Props) {
  return (
    <Paper
      component={ButtonBase}
      variant="clickableCard"
      onClick={onClick}
      sx={{
        // ButtonBase is inline-flex and row by default.
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 180,
        color: "text.secondary",
      }}
    >
      <AddCircleOutlineIcon sx={{ fontSize: 40, color: "primary.main" }} />
      <Typography sx={{ fontWeight: 700 }}>Start a new goal</Typography>
      <Typography variant="body2">Set a target and save towards it.</Typography>
    </Paper>
  );
}
