/** @file Placeholder card shown when nothing is being saved for: a dashed frame that opens the add form. */

import { Paper, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import { cardFrameSx } from "./styles";

interface Props {
  onClick: () => void;
}

/** Same frame as a GoalCard so the grid keeps its rhythm; dashed to read as "not a goal yet". */
export function NewGoalCard({ onClick }: Props) {
  return (
    <Paper
      variant="outlined"
      role="button"
      aria-label="Start a new saving"
      tabIndex={0}
      onClick={onClick}
      // Enter and Space, the two keys that activate a button.
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onClick();
      }}
      sx={[
        cardFrameSx,
        {
          alignItems: "center",
          justifyContent: "center",
          minHeight: 180,
          borderStyle: "dashed",
          color: "text.secondary",
        },
      ]}
    >
      <AddCircleOutlineIcon fontSize="large" />
      <Typography sx={{ fontWeight: 700 }}>Start a new saving</Typography>
      <Typography variant="body2">Set a target and save towards it.</Typography>
    </Paper>
  );
}
