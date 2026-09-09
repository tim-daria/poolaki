/** @file Modal for adding a transaction, and for viewing or deleting an existing one. */

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { DiscardChangesDialog } from "./CloseGuard";
import { ConfirmDialog } from "./ConfirmDialog";
import { ModalShell } from "./ModalShell";
import { useCloseGuard } from "./useCloseGuard";
import { FieldLabel } from "../Form/FieldLabel";
import { IsoDatePicker } from "../Form/IsoDatePicker";
import { MoneyField } from "../Form/MoneyField/MoneyField";
import { TextInput } from "../Form/TextInput";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { getCsrfToken } from "../../lib/csrf";
import { selectableCategories } from "../../lib/categories";
import { displayAmount } from "../../lib/money";
import { SEED_GOALS, goalById, type Goal } from "../../lib/goals";
import {
  CAN_EDIT_TRANSACTIONS,
  TransactionError,
  changeType,
  createTransaction,
  deleteTransaction,
  emptyDraft,
  toDraft,
  updateTransaction,
  validateDraft,
  type EntryType,
  type Transaction,
  type TransactionDraft,
} from "../../lib/transactions";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Omit on a page with nothing to update; the row is saved either way. */
  onSaved?: (t: Transaction) => void;
  /** The row being edited. Omitted for the Add flow. */
  transaction?: Transaction;
  /** Required alongside `transaction`: the Delete button lives in this modal. */
  onDeleted?: (id: number) => void;
}

/** Tab label per entry type. */
const TABS: { value: EntryType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "contribution", label: "Saving" },
];

/** "€1.790,00 of €2.000,00 saved", under the goal picker. */
function progressLabel(goal: Goal) {
  return `€${displayAmount(goal.saved_amount)} of €${displayAmount(goal.target_amount)} saved`;
}

const amountAdornment = {
  startAdornment: (
    <InputAdornment position="start" disableTypography>
      €
    </InputAdornment>
  ),
};

/** Passing `transaction` switches the modal into edit mode and adds Delete. */
export function TransactionForm({
  open,
  onClose,
  onSaved,
  transaction,
  onDeleted,
}: Props) {
  const org = useCurrentOrg();

  /**
   * The row being edited, captured on open; null in the Add flow. State, not
   * the prop: the page clears its selection as the dialog starts fading, which
   * would flip the title and drop Delete mid-fade-out.
   */
  const [editRow, setEditRow] = useState<Transaction | null>(null);
  const editing = editRow !== null;
  /** Read-only until the backend can persist an edit. */
  const locked = editing && !CAN_EDIT_TRANSACTIONS;

  /** One object holding every field, instead of one useState each. */
  const [draft, setDraft] = useState<TransactionDraft>(emptyDraft);

  /** Shown under the fields when validation or the request fails. */
  const [error, setError] = useState("");

  /** Blocks an accidental close while the form has unsaved changes. */
  const guard = useCloseGuard(draft, onClose);

  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isTransfer = draft.entry_type === "contribution";
  const selectedGoal = goalById(SEED_GOALS, draft.goal);

  /** Tracks the open/closed edge, so the block below runs once per opening. */
  const [wasOpen, setWasOpen] = useState(open);

  /**
   * Seeds the form on open: blank to add, the row's values to edit. The modal
   * stays mounted between openings, so this cannot be a reset on close. Done
   * during render, not in an effect, so the seeded fields are what gets painted
   * (https://react.dev/learn/you-might-not-need-an-effect).
   */
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      // `transaction` is read here rather than watched, since re-seeding
      // mid-edit would discard what the user has typed.
      const seeded = transaction ? toDraft(transaction) : emptyDraft();
      setEditRow(transaction ?? null);
      setDraft(seeded);
      setError("");
      setConfirmingDelete(false);
      // Passed explicitly: the setStates above have not landed, so the guard
      // would otherwise re-snapshot the values being replaced.
      guard.reset(seeded);
    }
  }

  /** Update one field, leaving the others untouched. */
  function set<K extends keyof TransactionDraft>(
    key: K,
    value: TransactionDraft[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Stop before the request if the draft is incomplete.
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setSaving(true);
    try {
      // A transfer may leave the description blank, in which case the goal name
      // shown in the placeholder is what gets stored.
      const saved = editRow
        ? await updateTransaction(
            org.id,
            editRow.id,
            draft,
            getCsrfToken(),
            selectedGoal?.name,
          )
        : await createTransaction(
            org.id,
            draft,
            getCsrfToken(),
            selectedGoal?.name,
          );
      onSaved?.(saved);
      onClose();
    } catch (err) {
      // A 400 describes what was typed and is shown as-is; anything else is not
      // actionable and gets the generic line.
      setError(
        err instanceof TransactionError
          ? err.message
          : "Could not save the transaction. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  /** Deletes the row being edited, once the confirmation has been answered. */
  async function handleDelete() {
    if (!editRow) return;

    setSaving(true);
    try {
      await deleteTransaction(org.id, editRow.id, getCsrfToken());
      onDeleted?.(editRow.id);
      onClose();
    } catch (err) {
      // A 400 is shown as written. The confirmation closes first, or the
      // message lands behind it.
      setConfirmingDelete(false);
      setError(
        err instanceof TransactionError
          ? err.message
          : "Could not delete the transaction. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title={editing ? "Edit transaction" : "Add transaction"}
      onClose={guard.requestClose}
    >
      {/* The form wraps content AND actions, or Enter never reaches submit. */}
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            {locked && (
              <Alert severity="info">
                Editing is not available yet. Delete the transaction and add it
                again to change it.
              </Alert>
            )}

            {/* A mode switch, not radio buttons: the type decides which
                fields the rest of the form has. */}
            <ToggleButtonGroup
              exclusive
              fullWidth
              disabled={locked}
              value={draft.entry_type}
              onChange={(_, value: EntryType | null) => {
                // Null when the pressed tab was already selected; ignoring it
                // keeps a tab from deselecting itself and clearing the form.
                if (!value) return;
                setDraft((d) => changeType(d, value));
                setError("");
              }}
              aria-label="Transaction type"
              sx={{
                bgcolor: "background.default",
                borderRadius: 2,
                p: 0.5,
                gap: 0.5,
                "& .MuiToggleButtonGroup-grouped": {
                  border: 0,
                  borderRadius: 2,
                  py: 1,
                  fontWeight: 700,
                  color: "text.primary",
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.main" },
                  },
                },
              }}
            >
              {TABS.map((tab) => (
                <ToggleButton key={tab.value} value={tab.value}>
                  {tab.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            {isTransfer ? (
              <FieldLabel
                label="Goal"
                htmlFor="transaction-goal"
                id="transaction-goal-label"
              >
                <TextField
                  id="transaction-goal"
                  select
                  disabled={locked}
                  /* null means "not picked yet", but MUI needs "" for that —
                     passing null would make the field uncontrolled. */
                  value={draft.goal ?? ""}
                  onChange={(e) => set("goal", Number(e.target.value))}
                  /* Collapsed, the field shows the name alone; the progress
                     figures go in the helper text below. */
                  slotProps={{
                    select: {
                      labelId: "transaction-goal-label",
                      displayEmpty: true,
                      renderValue: () =>
                        selectedGoal?.name ?? (
                          <Box
                            component="span"
                            sx={{ color: "text.secondary" }}
                          >
                            Select
                          </Box>
                        ),
                    },
                  }}
                  helperText={
                    selectedGoal ? progressLabel(selectedGoal) : undefined
                  }
                  required
                >
                  {SEED_GOALS.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      <Box sx={{ fontWeight: 700 }}>{g.name}</Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: "auto", pl: 3 }}
                      >
                        €{displayAmount(g.saved_amount)} / €
                        {displayAmount(g.target_amount)}
                      </Typography>
                    </MenuItem>
                  ))}
                </TextField>
              </FieldLabel>
            ) : (
              <FieldLabel
                label="Category"
                htmlFor="transaction-category"
                id="transaction-category-label"
              >
                <TextField
                  id="transaction-category"
                  select
                  disabled={locked}
                  value={draft.category ?? ""}
                  onChange={(e) => set("category", Number(e.target.value))}
                  slotProps={{
                    select: {
                      labelId: "transaction-category-label",
                      displayEmpty: true,
                      renderValue: (value) =>
                        value === "" ? (
                          <Box
                            component="span"
                            sx={{ color: "text.secondary" }}
                          >
                            Select
                          </Box>
                        ) : (
                          selectableCategories(draft.entry_type).find(
                            (c) => c.id === value,
                          )?.label
                        ),
                    },
                  }}
                  required
                >
                  {selectableCategories(draft.entry_type).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </FieldLabel>
            )}

            {/* Text, not a number input: useMoneyField handles typing,
                pasting and formatting — see docs/frontend/money.md. */}
            <FieldLabel label="Amount" htmlFor="transaction-amount">
              <MoneyField
                id="transaction-amount"
                disabled={locked}
                value={draft.amount}
                onChange={(amount) => set("amount", amount)}
                placeholder="0,00"
                required
                slotProps={{ input: amountAdornment }}
              />
            </FieldLabel>

            {/* The model has one free-text column, so this field is both the
                row's label and its note. A transfer may leave it blank and
                fall back to the goal name. */}
            <FieldLabel
              label="Description"
              optional={isTransfer}
              htmlFor="transaction-description"
            >
              <TextInput
                id="transaction-description"
                casing="name"
                disabled={locked}
                value={draft.description}
                onChange={(description) => set("description", description)}
                placeholder={
                  isTransfer ? (selectedGoal?.name ?? "") : "e.g. Grocery run"
                }
                required={!isTransfer}
              />
            </FieldLabel>

            <FieldLabel label="Date" htmlFor="transaction-date">
              <IsoDatePicker
                disabled={locked}
                value={draft.transaction_date}
                onChange={(iso) => set("transaction_date", iso)}
                slotProps={{
                  textField: { id: "transaction-date", required: true },
                }}
              />
            </FieldLabel>

            {/* Expenses only; changeType clears it when switching tabs. */}
            {draft.entry_type === "expense" && (
              <FormControlLabel
                control={
                  <Checkbox
                    disabled={locked}
                    checked={draft.is_tax_deductible}
                    onChange={(e) => set("is_tax_deductible", e.target.checked)}
                  />
                }
                label="Tax refundable"
              />
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>

        {/* Delete sits apart from the Cancel/Save pair, out of reach of a
            misdirected click on Save. */}
        <DialogActions sx={{ justifyContent: "space-between" }}>
          {editing && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving}
            >
              Delete
            </Button>
          )}
          <Stack direction="row" spacing={1} sx={{ ml: "auto" }}>
            <Button onClick={guard.requestClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              // Nothing to save on a locked or untouched edit.
              disabled={
                saving || locked || (editing && !guard.hasUnsavedChanges)
              }
            >
              {editing
                ? saving
                  ? "Saving…"
                  : "Save changes"
                : saving
                  ? "Adding…"
                  : "Add"}
            </Button>
          </Stack>
        </DialogActions>
      </form>

      <DiscardChangesDialog
        guard={guard}
        message="This transaction has unsaved changes. Closing now will lose them."
      />

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this transaction?"
        message="The amount goes back to the workspace balance. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
        busy={saving}
      />
    </ModalShell>
  );
}
