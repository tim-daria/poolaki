/** @file Closest goal card: the unfinished goal with the least left to save, and its progress. */

import { Link as RouterLink } from "react-router";
import {
  Box,
  Chip,
  LinearProgress,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import { Money } from "../../components/Money";
import { displayAmount } from "../../lib/money";
import type { Goal } from "../../lib/goals";
import { goalPercent } from "../../lib/overview";
import { HomeCard, PlaceholderBar } from "./HomeCard";

interface Props {
  goal: Goal | undefined;
  onCreateGoal: () => void;
}

const iconTileSx = {
  width: 48,
  height: 48,
  flexShrink: 0,
  borderRadius: 2,
  display: "grid",
  placeItems: "center",
  bgcolor: "primary.light",
  color: "primary.dark",
} as const;

export function ClosestGoalCard({ goal, onCreateGoal }: Props) {
  if (!goal) {
    return (
      <HomeCard title="Closest Goal">
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box
            sx={[
              iconTileSx,
              {
                color: "text.disabled",
                border: "1px dashed",
                borderColor: "divider",
              },
            ]}
          >
            <TrackChangesIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: "text.disabled", fontWeight: 600, mb: 1 }}>
              No goals yet
            </Typography>
            <PlaceholderBar sx={{ height: 8 }} />
          </Box>
        </Stack>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Save toward something specific and track it here.{" "}
          <Link
            component="button"
            underline="hover"
            onClick={onCreateGoal}
            sx={{ font: "inherit", fontWeight: 700, color: "primary.dark" }}
          >
            Create a goal
          </Link>
        </Typography>
      </HomeCard>
    );
  }

  const percent = goalPercent(goal);
  const remaining = goal.target_amount - goal.saved_amount;

  return (
    <HomeCard
      title="Closest Goal"
      aside={
        <Chip
          label={`€${displayAmount(remaining)} to go`}
          sx={{ bgcolor: "primary.light", fontWeight: 600 }}
        />
      }
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Box sx={iconTileSx}>
          <SavingsOutlinedIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography sx={{ fontWeight: 700 }} noWrap>
              {goal.name}
            </Typography>
            <Money sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              €{displayAmount(goal.saved_amount)}/€
              {displayAmount(goal.target_amount)}
            </Money>
          </Stack>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", mt: 1 }}
          >
            <LinearProgress
              variant="determinate"
              value={percent}
              aria-label={`${goal.name} progress`}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 999,
                bgcolor: "primary.light",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 999,
                  bgcolor: "primary.dark",
                },
              }}
            />
            <Money sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              {percent}%
            </Money>
          </Stack>
        </Box>
      </Stack>

      <Link
        component={RouterLink}
        to="goals"
        underline="hover"
        sx={{ fontWeight: 700, color: "primary.dark", alignSelf: "flex-start" }}
      >
        All goals →
      </Link>
    </HomeCard>
  );
}
