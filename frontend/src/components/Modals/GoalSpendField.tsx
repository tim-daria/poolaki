/** @file "Pay from goal" on an expense: the opt-in chip, the goal picker and the live split preview. */

import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { FieldLabel } from "../Form/FieldLabel";
import { goalById, type Goal } from "../../lib/goals";
import { goalLeft, splitExpense, type ExpenseSplit } from "../../lib/goalSpend";
import { displayAmount } from "../../lib/money";

const RULE =
  "Money is taken from the goal first. If the goal runs out, the rest comes from your balance.";

interface Props {
  /** Only goals the server lets an expense draw from. */
  goals: Goal[];
  value: number | null;
  onChange: (goal: number | null) => void;
  /** The expense's canonical amount string, "" while empty. */
  amount: string;
  /** The picker has been opened but may have no goal yet. */
  expanded: boolean;
  onExpand: () => void;
  onRemove: () => void;
  /** Edit mode: the goal is fixed for life, so the picker is read-only and Remove is gone. */
  disabled: boolean;
}

/** Renders nothing when there is no goal to pay from and nothing to show. */
export function GoalSpendField({
  goals,
  value,
  onChange,
  amount,
  expanded,
  onExpand,
  onRemove,
  disabled,
}: Props) {
  const selected = goalById(goals, value);

  if (!expanded && value === null) {
    if (disabled || goals.length === 0) return null;
    return (
      <Box>
        <Chip
          icon={<AddIcon />}
          label="Pay from a goal"
          variant="outlined"
          clickable
          onClick={onExpand}
          sx={{
            fontWeight: 600,
            color: "primary.dark",
            bgcolor: "primary.light",
            borderStyle: "dashed",
            borderColor: "primary.main",
            "& .MuiChip-icon": { color: "primary.dark" },
          }}
        />
      </Box>
    );
  }

  const parsed = Number(amount);
  const split =
    selected && parsed > 0 ? splitExpense(parsed, selected.balance) : null;

  return (
    <FieldLabel
      label="Pay from goal"
      info={RULE}
      htmlFor="transaction-spend-goal"
      id="transaction-spend-goal-label"
      action={
        !disabled && (
          <Button
            variant="text"
            size="small"
            onClick={onRemove}
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              fontSize: "0.8rem",
              minWidth: 0,
              px: 1,
              "&:hover": {
                bgcolor: "transparent",
                textDecoration: "underline",
              },
            }}
          >
            Remove
          </Button>
        )
      }
    >
      <Stack spacing={1.5}>
        <TextField
          id="transaction-spend-goal"
          select
          disabled={disabled}
          /* null means "not picked yet", but MUI needs "" for that. */
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          slotProps={{
            select: {
              labelId: "transaction-spend-goal-label",
              displayEmpty: true,
              renderValue: () =>
                selected ? (
                  <>
                    {selected.name}
                    <Box
                      component="span"
                      sx={{ ml: 1, color: "text.secondary" }}
                    >
                      · €{displayAmount(goalLeft(selected))} left
                    </Box>
                  </>
                ) : (
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    Select
                  </Box>
                ),
            },
          }}
          required
        >
          {goals.map((g) => (
            <MenuItem key={g.id} value={g.id}>
              <Box sx={{ fontWeight: 700 }}>{g.name}</Box>
              <LeftLabel goal={g} />
            </MenuItem>
          ))}
        </TextField>
        {selected && split && <SplitPreview split={split} goal={selected} />}
      </Stack>
    </FieldLabel>
  );
}

/** "€40,00 left", or the warning that an empty goal cannot pay anything. */
function LeftLabel({ goal }: { goal: Goal }) {
  const left = goalLeft(goal);
  return (
    <Typography
      variant="body2"
      sx={{
        ml: "auto",
        pl: 3,
        color: left > 0 ? "text.secondary" : "error.main",
      }}
    >
      €{displayAmount(left)} left
      {left === 0 && " · will be paid from balance"}
    </Typography>
  );
}

/** The two lines under the bar, one pair per split kind. */
function previewCopy(split: ExpenseSplit, goal: string) {
  const fromGoal = `€${displayAmount(split.fromGoal)} from ${goal}`;
  const fromBalance = `€${displayAmount(split.fromBalance)} from balance`;
  const over = displayAmount(Math.abs(split.leftAfter));
  switch (split.kind) {
    case "covered":
      return {
        goalPart: fromGoal,
        balancePart: null,
        detail: `€${displayAmount(split.leftAfter)} will be left in the goal.`,
      };
    case "runs_out":
      return {
        goalPart: fromGoal,
        balancePart: fromBalance,
        detail: `The goal runs out with this expense and goes over by €${over}.`,
      };
    case "empty":
      return {
        goalPart: null,
        balancePart: fromBalance,
        detail: `${goal} is empty. This still counts toward it and adds to “over by”.`,
      };
  }
}

function SplitPreview({ split, goal }: { split: ExpenseSplit; goal: Goal }) {
  const total = split.fromGoal + split.fromBalance;
  const goalShare = total > 0 ? (split.fromGoal / total) * 100 : 0;
  const copy = previewCopy(split, goal.name);
  return (
    <Box sx={{ bgcolor: "background.default", borderRadius: 2, p: 1.5 }}>
      {/* The numbers are repeated as text below; the bar only draws them. */}
      <Box
        role="img"
        aria-label={`${copy.goalPart ?? ""}${copy.goalPart && copy.balancePart ? ", " : ""}${copy.balancePart ?? ""}`}
        sx={{
          display: "flex",
          height: 8,
          borderRadius: 999,
          overflow: "hidden",
          bgcolor: "primary.light",
        }}
      >
        <Box sx={{ width: `${goalShare}%`, bgcolor: "primary.dark" }} />
        <Box
          sx={(theme) => ({
            flex: 1,
            backgroundColor: theme.palette.error.light,
            backgroundImage: `repeating-linear-gradient(135deg, ${theme.palette.error.main} 0 3px, transparent 3px 6px)`,
            // A fully covered expense has no balance part to hatch.
            display: split.fromBalance > 0 ? "block" : "none",
          })}
        />
      </Box>
      <Typography sx={{ mt: 1, fontWeight: 700, fontSize: "0.9rem" }}>
        {copy.goalPart}
        {copy.goalPart && copy.balancePart && " · "}
        {copy.balancePart && (
          <Box component="span" sx={{ color: "error.main" }}>
            {copy.balancePart}
          </Box>
        )}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
        {copy.detail}
      </Typography>
    </Box>
  );
}
