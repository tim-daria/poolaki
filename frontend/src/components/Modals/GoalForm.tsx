/** @file Modal for adding or editing a savings goal; edit mode can also archive it. */

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DiscardChangesDialog } from "./CloseGuard";
import { ConfirmDialog } from "./ConfirmDialog";
import { ModalShell } from "./ModalShell";
import { useCloseGuard } from "./useCloseGuard";
import { FieldLabel } from "../Form/FieldLabel";
import { IsoDatePicker } from "../Form/IsoDatePicker";
import { MoneyField } from "../Form/MoneyField/MoneyField";
import { TextInput } from "../Form/TextInput";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useToast } from "../../context/useToast";
import { getCsrfToken } from "../../lib/csrf";
import { displayAmount } from "../../lib/money";
import {
  GoalError,
  createGoal,
  emptyGoalDraft,
  goalPatch,
  toGoalDraft,
  updateGoal,
  validateGoalDraft,
  type Goal,
  type GoalDraft,
  type GoalStatus,
} from "../../lib/goals";

interface Props {
  open: boolean;
  /** The goal to edit; null or omitted adds a new one. */
  goal?: Goal | null;
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

/**
 * What archiving does to the money, with the real figure. The server books it
 * itself: a withdrawal returns what is left, a contribution settles an overdraft.
 */
function archiveNote(goal: Goal): string {
  if (goal.balance < 0) {
    return `This goal is €${displayAmount(-goal.balance)} over. Archiving settles that from your balance and closes the goal.`;
  }
  return goal.balance > 0
    ? `Archiving returns €${displayAmount(goal.balance)} left in this goal to your balance. The goal can no longer be edited or contributed to.`
    : "Nothing is left in this goal to return. Archiving only closes it; it can no longer be edited or contributed to.";
}

export function GoalForm({ open, goal, onClose, onSaved }: Props) {
  const org = useCurrentOrg();
  const { showToast } = useToast();

  const editing = goal ?? null;

  const [draft, setDraft] = useState<GoalDraft>(emptyGoalDraft);
  /** Edit mode only: active ⇄ completed. Archiving goes through its own button. */
  const [status, setStatus] = useState<GoalStatus>("active");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  /**
   * Blocks an accidental close while the form has unsaved changes. Watches the
   * status too, so flipping the switch counts as a change.
   */
  const guard = useCloseGuard({ ...draft, status }, onClose);

  /**
   * Seeds the form on open: blank to add, the goal's values to edit. The modal
   * stays mounted between openings, so this cannot be a reset on close. Done
   * during render, not in an effect, so the seeded fields are what gets painted.
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const seeded = editing ? toGoalDraft(editing) : emptyGoalDraft();
      const seededStatus = editing?.status ?? "active";
      setDraft(seeded);
      setStatus(seededStatus);
      setError("");
      setConfirmingArchive(false);
      // Passed explicitly: the setState calls above have not landed yet.
      guard.reset({ ...seeded, status: seededStatus });
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
      if (editing) {
        const patch = goalPatch(editing, draft, status);
        // The server rejects an empty body; nothing changed, so just close.
        if (Object.keys(patch).length === 0) {
          onClose();
          return;
        }
        const saved = await updateGoal(
          org.id,
          editing.id,
          patch,
          getCsrfToken(),
        );
        onSaved?.(saved);
        onClose();
        showToast("Goal updated");
      } else {
        const saved = await createGoal(org.id, draft, getCsrfToken());
        onSaved?.(saved);
        onClose();
        showToast("Goal added");
      }
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

  async function handleArchive() {
    if (!editing) return;
    setSaving(true);
    try {
      const saved = await updateGoal(
        org.id,
        editing.id,
        { status: "archived" },
        getCsrfToken(),
      );
      onSaved?.(saved);
      onClose();
      showToast("Goal archived");
    } catch (err) {
      setError(
        err instanceof GoalError
          ? err.message
          : "Could not archive the goal. Please try again.",
      );
    } finally {
      setSaving(false);
      setConfirmingArchive(false);
    }
  }

  const note = editing ? archiveNote(editing) : "";

  return (
    <ModalShell
      open={open}
      title={editing ? "Edit saving" : "Add saving"}
      onClose={guard.requestClose}
    >
      {/* The form wraps content AND actions, or Enter never reaches submit. */}
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
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

            {/* Optional: a goal without a deadline is spendable while active. */}
            <FieldLabel
              label="Target date"
              htmlFor="goal-date"
              id="goal-date-label"
            >
              <IsoDatePicker
                labelId="goal-date-label"
                value={draft.target_date}
                onChange={(iso) => set("target_date", iso)}
                slotProps={{ textField: { id: "goal-date" } }}
              />
            </FieldLabel>

            {editing && (
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={status === "completed"}
                      onChange={(_, on) =>
                        setStatus(on ? "completed" : "active")
                      }
                    />
                  }
                  label="Mark as completed"
                />
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  A completed goal can only be spent from. Switch it off to keep
                  saving.
                </Typography>
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between" }}>
          {editing && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setConfirmingArchive(true)}
                disabled={saving}
              >
                Archive
              </Button>
              <Tooltip title={note} arrow>
                {/* Focusable so the note is reachable from the keyboard; the
                    aria-label carries it for screen readers without hovering. */}
                <Box
                  component="span"
                  tabIndex={0}
                  role="note"
                  aria-label={note}
                  sx={{
                    display: "inline-flex",
                    color: "text.secondary",
                    cursor: "help",
                    "&:focus-visible": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                      borderRadius: "50%",
                    },
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: "1rem" }} />
                </Box>
              </Tooltip>
            </Box>
          )}
          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            <Button onClick={guard.requestClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              // Nothing to save on an untouched edit.
              disabled={
                saving || (editing !== null && !guard.hasUnsavedChanges)
              }
            >
              {editing
                ? saving
                  ? "Saving…"
                  : "Save changes"
                : saving
                  ? "Adding…"
                  : "Create"}
            </Button>
          </Stack>
        </DialogActions>
      </form>

      <DiscardChangesDialog
        guard={guard}
        message={
          editing
            ? "Your changes have not been saved. Closing now will lose them."
            : "This goal has not been created yet. Closing now will lose what you entered."
        }
      />
      <ConfirmDialog
        open={confirmingArchive}
        title="Archive this saving?"
        message={note}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setConfirmingArchive(false)}
        busy={saving}
      />
    </ModalShell>
  );
}
