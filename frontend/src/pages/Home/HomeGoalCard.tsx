/** @file Goal card: the active goal closest to completion, or an invitation to create the first one. */

import {
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import { Money } from "../../components/Money";
import type { Goal } from "../../lib/goals";
import { displayWhole } from "../../lib/money";
import { activeGoals, closestGoal, goalPercent } from "../../lib/overview";
import { HomeCard, HomeCardAction } from "./HomeCard";
import { TABLET } from "../../lib/layout";

interface Props {
  goals: Goal[];
  onCreateGoal: () => void;
  /** Placement in the page grid. */
  sx?: SxProps<Theme>;
}

export function HomeGoalCard({ goals, onCreateGoal, sx }: Props) {
  const active = activeGoals(goals);
  const goal = closestGoal(goals);

  if (!goal) {
    return (
      <HomeCard title="Goal" sx={sx}>
        {/* One line and a button: the same height as the filled state, so
            the sidebar does not jump when the first goal is created. */}
        <Stack
          spacing={1}
          sx={{ alignItems: "center", [TABLET]: { my: "auto" } }}
        >
          <Typography sx={{ color: "text.secondary", textAlign: "center" }}>
            Save toward something
          </Typography>
          <Button
            variant="outlined"
            onClick={onCreateGoal}
            sx={{
              minHeight: 44,
              fontWeight: 600,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Create a goal
          </Button>
        </Stack>
      </HomeCard>
    );
  }

  const percent = goalPercent(goal);
  const remaining = Math.max(0, goal.target_amount - goal.balance);

  return (
    <HomeCard
      sx={sx}
      title="Almost there"
      to="savings"
      action={
        <HomeCardAction>
          {active.length === 1 ? "Manage" : "All goals"}
        </HomeCardAction>
      }
    >
      <Stack spacing={1.25} sx={{ [TABLET]: { my: "auto" } }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 2,
          }}
        >
          <Typography sx={{ fontWeight: 500, minWidth: 0 }} noWrap>
            {goal.name}
          </Typography>
          {/* Only the saved amount carries the primary colour. */}
          <Money
            sx={{
              fontSize: "1rem",
              color: "text.secondary",
              whiteSpace: "nowrap",
            }}
          >
            <Box
              component="span"
              sx={{ color: goal.balance < 0 ? "error.main" : "text.primary" }}
            >
              {goal.balance < 0 && "−"}€{displayWhole(Math.abs(goal.balance))}
            </Box>{" "}
            / €{displayWhole(goal.target_amount)}
          </Money>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-label={`${goal.name} progress`}
          sx={{
            height: 8,
            borderRadius: 999,
            bgcolor: "primary.light",
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
              bgcolor: "primary.dark",
            },
          }}
        />
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", textAlign: "left" }}
        >
          <Money>€{displayWhole(remaining)}</Money> to go · {percent}%
        </Typography>
      </Stack>
    </HomeCard>
  );
}
