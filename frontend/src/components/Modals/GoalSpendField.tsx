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
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import { FieldLabel } from "../Form/FieldLabel";
import { goalById, type Goal } from "../../lib/goals";
import { goalLeft, splitExpense, type ExpenseSplit } from "../../lib/goalSpend";
import { displayAmount } from "../../lib/money";

const RULE =
  "Money is taken from the goal first. If you spend more than it holds, the goal goes below zero instead of using your balance. The difference is settled from your balance when you archive the goal.";

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
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          slotProps={{
            select: {
              labelId: "transaction-spend-goal-label",
              displayEmpty: true,
              renderValue: () =>
                selected ? (
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <SavingsOutlinedIcon
                      fontSize="small"
                      sx={{ color: "primary.main" }}
                    />
                    {selected.name}
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      · €{displayAmount(goalLeft(selected))} left
                    </Box>
                  </Box>
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

/** "€40,00 left", or the warning that an empty goal goes straight below zero. */
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
      {left === 0 && " · will go below zero"}
    </Typography>
  );
}

/**
 * The headline and the line under it, per split kind. `over` is the amount
 * the goal goes below zero by, coloured red by the component; null when the
 * goal covers the expense.
 */
function previewCopy(split: ExpenseSplit, goal: string) {
  if (split.kind === "covered") {
    return {
      over: null,
      headline: `€${displayAmount(split.fromGoal)} from ${goal}`,
      detail: `€${displayAmount(split.leftAfter)} will be left in the goal.`,
    };
  }
  const over = Math.abs(split.leftAfter);
  return {
    over,
    headline: `${goal}'s balance`,
    detail: `The goal will be overdrawn by €${displayAmount(over)}. Your net balance won't change yet.`,
  };
}

/** The bar draws the covered share dark and the overdrawn share red; the text repeats the numbers. */
function SplitPreview({ split, goal }: { split: ExpenseSplit; goal: Goal }) {
  const total = split.fromGoal + split.fromBalance;
  const goalShare = total > 0 ? (split.fromGoal / total) * 100 : 0;
  const copy = previewCopy(split, goal.name);
  const label =
    copy.over === null
      ? copy.headline
      : `€${displayAmount(copy.over)} over ${copy.headline}`;
  return (
    <Box sx={{ bgcolor: "background.default", borderRadius: 2, p: 1.5 }}>
      <Box
        role="img"
        aria-label={label}
        sx={{
          display: "flex",
          height: 8,
          borderRadius: 999,
          overflow: "hidden",
          bgcolor: "primary.light",
        }}
      >
        <Box sx={{ width: `${goalShare}%`, bgcolor: "primary.dark" }} />
        {split.fromBalance > 0 && (
          <Box sx={{ flex: 1, bgcolor: "error.light" }} />
        )}
      </Box>
      <Typography sx={{ mt: 1, fontWeight: 700, fontSize: "0.9rem" }}>
        {copy.over !== null && (
          <Box component="span" sx={{ color: "error.main" }}>
            €{displayAmount(copy.over)} over{" "}
          </Box>
        )}
        {copy.headline}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
        {copy.detail}
      </Typography>
    </Box>
  );
}
