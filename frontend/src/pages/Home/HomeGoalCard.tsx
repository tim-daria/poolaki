/** @file Goal card: the active goal closest to completion, or an invitation to create the first one. */

import { Box, Button, LinearProgress, Stack, Typography } from "@mui/material";
import { Money } from "../../components/Money";
import type { Goal } from "../../lib/goals";
import { displayWhole } from "../../lib/money";
import { activeGoals, closestGoal, goalPercent } from "../../lib/overview";
import { HomeCard, HomeCardAction } from "./HomeCard";
import { TABLET } from "./layout";

interface Props {
  goals: Goal[];
  onCreateGoal: () => void;
}

export function HomeGoalCard({ goals, onCreateGoal }: Props) {
  const active = activeGoals(goals);
  const goal = closestGoal(goals);

  if (!goal) {
    return (
      <HomeCard title="Goal" sx={{ [TABLET]: { flex: 1 } }}>
        <Stack spacing={1.5}>
          <Typography sx={{ fontWeight: 600 }}>
            Save toward something
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            A trip, a new laptop, an emergency fund. Set an amount and watch it
            fill up as you save.
          </Typography>
          <Button
            variant="outlined"
            onClick={onCreateGoal}
            sx={{
              minHeight: 44,
              fontWeight: 600,
              alignSelf: { xs: "stretch", sm: "flex-start" },
            }}
          >
            Create a goal
          </Button>
        </Stack>
      </HomeCard>
    );
  }

  const percent = goalPercent(goal);
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);

  return (
    <HomeCard
      title="Almost there"
      to="savings"
      action={
        <HomeCardAction>
          {active.length === 1 ? "Manage" : "All goals"}
        </HomeCardAction>
      }
      // Fills its cell when paired with the spending card; the content
      // centres in the extra room.
      sx={{ [TABLET]: { flex: 1 } }}
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
            <Box component="span" sx={{ color: "text.primary" }}>
              €{displayWhole(goal.saved_amount)}
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
