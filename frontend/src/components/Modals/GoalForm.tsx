/** @file Modal for adding a savings goal. Add-only until the goals API lands. */

import { useState } from "react";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  InputAdornment,
  Stack,
} from "@mui/material";
import { DiscardChangesDialog } from "./CloseGuard";
import { ModalShell } from "./ModalShell";
import { useCloseGuard } from "./useCloseGuard";
import { FieldLabel } from "../Form/FieldLabel";
import { IsoDatePicker } from "../Form/IsoDatePicker";
import { MoneyField } from "../Form/MoneyField/MoneyField";
import { TextInput } from "../Form/TextInput";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useToast } from "../../context/useToast";
import { getCsrfToken } from "../../lib/csrf";
import {
  CAN_CREATE_GOALS,
  GoalError,
  createGoal,
  emptyGoalDraft,
  validateGoalDraft,
  type Goal,
  type GoalDraft,
} from "../../lib/goals";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Omit on a page with nothing to update; the goal is saved either way. */
  onSaved?: (goal: Goal) => void;
}

const amountAdornment = {
  startAdornment: (
    <InputAdornment position="start" disableTypography>
      €
    </InputAdornment>
  ),
};

export function GoalForm({ open, onClose, onSaved }: Props) {
  const org = useCurrentOrg();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<GoalDraft>(emptyGoalDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /** Blocks an accidental close while the form has unsaved changes. */
  const guard = useCloseGuard(draft, onClose);

  /**
   * Seeds a blank form on open. The modal stays mounted between openings, so
   * this cannot be a reset on close. Done during render, not in an effect, so
   * the seeded fields are what gets painted.
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const seeded = emptyGoalDraft();
      setDraft(seeded);
      setError("");
      // Passed explicitly: the setState above has not landed yet.
      guard.reset(seeded);
    }
  }

  function set<K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const problem = validateGoalDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setSaving(true);
    try {
      const saved = await createGoal(org.id, draft, getCsrfToken());
      onSaved?.(saved);
      onClose();
      showToast("Goal added");
    } catch (err) {
      setError(
        err instanceof GoalError
          ? err.message
          : "Could not save the goal. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} title="Add saving" onClose={guard.requestClose}>
      {/* The form wraps content AND actions, or Enter never reaches submit. */}
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            {!CAN_CREATE_GOALS && (
              <Alert severity="info">
                Goals cannot be saved yet. The form is here to try; Create turns
                on once the backend supports goals.
              </Alert>
            )}

            <FieldLabel label="Name" htmlFor="goal-name">
              <TextInput
                id="goal-name"
                casing="name"
                value={draft.name}
                onChange={(name) => set("name", name)}
                placeholder="e.g. Future cat mansion"
                required
                autoFocus
              />
            </FieldLabel>

            <FieldLabel label="Target amount" htmlFor="goal-amount">
              <MoneyField
                id="goal-amount"
                value={draft.target_amount}
                onChange={(target_amount) =>
                  set("target_amount", target_amount)
                }
                placeholder="0,00"
                required
                slotProps={{ input: amountAdornment }}
              />
            </FieldLabel>

            {/* Required, not optional as the design suggests: the column is
                NOT NULL, so a goal without a date cannot be stored. */}
            <FieldLabel
              label="Target date"
              htmlFor="goal-date"
              id="goal-date-label"
            >
              <IsoDatePicker
                labelId="goal-date-label"
                value={draft.target_date}
                onChange={(iso) => set("target_date", iso)}
                slotProps={{ textField: { id: "goal-date", required: true } }}
              />
            </FieldLabel>

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={guard.requestClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || !CAN_CREATE_GOALS}
          >
            {saving ? "Adding…" : "Create"}
          </Button>
        </DialogActions>
      </form>

      <DiscardChangesDialog
        guard={guard}
        message="This goal has not been created yet. Closing now will lose what you entered."
      />
    </ModalShell>
  );
}
