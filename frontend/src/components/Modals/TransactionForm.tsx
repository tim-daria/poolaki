/** @file Modal for adding a transaction, and for editing or deleting an existing one. */

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
import AddIcon from "@mui/icons-material/Add";
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
import {
  selectableCategories,
  contributionCategory,
} from "../../lib/categories";
import { displayAmount } from "../../lib/money";
import { canTransfer, goalById, isSpendable, type Goal } from "../../lib/goals";
import { GoalSpendField } from "./GoalSpendField";
import { useGoals } from "../../hooks/useGoals";
import { GoalForm } from "./GoalForm";

import {
  TransactionError,
  changeType,
  createTransaction,
  deleteTransaction,
  emptyDraft,
  isTransfer as isTransferType,
  toDraft,
  transferDraft,
  updateTransaction,
  validateDraft,
  type EntryType,
  type Transaction,
  type TransactionDraft,
} from "../../lib/transactions";
import { useCategories } from "../../hooks/useCategories";
import { TransferDirection, type Direction } from "./TransferDirection";
import { useAuth } from "../../context/useAuth";
import { canEditTransaction } from "../../lib/access";

/** Why the type and goal are fixed for one opening of the form. */
type LockReason = "editing" | "contributing";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Omit on a page with nothing to update; the row is saved either way. */
  onSaved?: (t: Transaction) => void;
  /** The row being edited. Omitted for the Add flow. */
  transaction?: Transaction;
  /** Required alongside `transaction`: the Delete button lives in this modal. */
  onDeleted?: (id: number) => void;
  /**
   * Add flow only: open on the Saving tab contributing to this goal. The type
   * and goal are then fixed for that opening, like in edit mode. Ignored when
   * `transaction` is set.
   */
  goal?: number;
  /** With goal: which way the money moves. Defaults to a contribution. */
  direction?: "contribution" | "withdraw";
}

/** Tab label per entry type. */
const TABS: { value: EntryType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "contribution", label: "Savings" },
];

/** "€1.790,00 of €2.000,00 saved", under the goal picker. */
function progressLabel(goal: Goal) {
  return `€${displayAmount(goal.balance)} of €${displayAmount(goal.target_amount)} saved`;
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
  goal,
  direction,
}: Props) {
  const org = useCurrentOrg();
  const categories = useCategories();
  const { user } = useAuth();
  const { showToast } = useToast();

  /**
   * The row being edited, captured on open; null in the Add flow. State, not
   * the prop: the page clears its selection as the dialog starts fading, which
   * would flip the title and drop Delete mid-fade-out.
   */
  const [editRow, setEditRow] = useState<Transaction | null>(null);
  const editing = editRow !== null;

  const foreign = editing && !canEditTransaction(editRow, user?.username);

  /**
   * Why the type and goal are fixed this opening; null when they are free.
   * One value, so every control that locks reads the same decision. State for
   * the same reason as `editRow`: the Goals page clears its chosen goal as the
   * dialog fades, which would unlock the tabs mid-fade-out.
   */
  const [lockReason, setLockReason] = useState<LockReason | null>(null);
  const locked = lockReason !== null || foreign;

  /** One object holding every field, instead of one useState each. */
  const [draft, setDraft] = useState<TransactionDraft>(emptyDraft);

  /** Shown under the fields when validation or the request fails. */
  const [error, setError] = useState("");

  /** Blocks an accidental close while the form has unsaved changes. */
  const guard = useCloseGuard(draft, onClose);

  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  /** The nested "new goal" form; a counter makes useGoals refetch after a save. */
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [goalsVersion, setGoalsVersion] = useState(0);

  /**
   * The expense's "Pay from goal" picker is open. Not part of the draft: the
   * draft only records a chosen goal, and opening the picker is not a change
   * worth guarding.
   */
  const [payingFromGoal, setPayingFromGoal] = useState(false);

  const isTransfer = isTransferType(draft.entry_type);
  const isExpense = draft.entry_type === "expense";
  const goals = useGoals(`${open}:${goalsVersion}`);

  const selectedGoal = goalById(goals, draft.goal);
  const spendableGoals = goals.filter(isSpendable);
  const options = selectableCategories(categories, draft.entry_type);

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
      const seeded = transaction
        ? toDraft(transaction)
        : goal !== undefined
          ? transferDraft(goal, direction ?? "contribution")
          : emptyDraft();
      setEditRow(transaction ?? null);
      setLockReason(
        transaction ? "editing" : goal !== undefined ? "contributing" : null,
      );
      setDraft(seeded);
      setPayingFromGoal(
        seeded.entry_type === "expense" && seeded.goal !== null,
      );
      setError("");
      setConfirmingDelete(false);
      setCreatingGoal(false);

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
    const problem = validateDraft(draft, goals);
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setSaving(true);
    // A transfer has no category picker, so it is filed under the workspace's
    // Contribution category. Null while the list loads; the backend allows it.
    const payload = isTransfer
      ? {
          ...draft,
          category:
            draft.entry_type === "contribution"
              ? (contributionCategory(categories)?.id ?? null)
              : null,
        }
      : draft;
    try {
      // A transfer may leave the description blank, in which case the goal name
      // shown in the placeholder is what gets stored.
      const saved = editRow
        ? await updateTransaction(
            org.id,
            editRow.id,
            payload,
            getCsrfToken(),
            selectedGoal?.name,
          )
        : await createTransaction(
            org.id,
            payload,
            getCsrfToken(),
            selectedGoal?.name,
          );
      onSaved?.(saved);
      onClose();
      showToast(editRow ? "Transaction updated" : "Transaction added");
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
      showToast("Transaction deleted");
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
      title={
        editing
          ? "Edit transaction"
          : lockReason === "contributing"
            ? draft.entry_type === "withdraw"
              ? "Withdraw"
              : "Contribute"
            : "Add transaction"
      }
      onClose={guard.requestClose}
    >
      {/* The form wraps content AND actions, or Enter never reaches submit. */}
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            {/* A mode switch, not radio buttons: the type decides which
                fields the rest of the form has. */}
            <ToggleButtonGroup
              exclusive
              fullWidth
              /* The backend's PATCH ignores entry_type and goal_id: a row keeps
                 its type and goal for life, so the switch is off while editing.
                 Also off when contributing to a goal, so that flow stays on
                 the Saving tab with the chosen goal. */
              disabled={locked}
              value={
                draft.entry_type === "withdraw"
                  ? "contribution"
                  : draft.entry_type
              }
              onChange={(_, value: EntryType | null) => {
                // Null when the pressed tab was already selected; ignoring it
                // keeps a tab from deselecting itself and clearing the form.
                if (!value) return;
                setDraft((d) => changeType(d, value));
                setPayingFromGoal(false);
                setError("");
              }}
              aria-label="Transaction type"
              sx={{
                borderRadius: 2,
                "& .MuiToggleButtonGroup-grouped": { py: 1 },
              }}
            >
              {TABS.map((tab) => (
                <ToggleButton key={tab.value} value={tab.value}>
                  {tab.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {lockReason === "editing" && (
              <Alert severity="info">
                {foreign
                  ? `This transaction is added by ${editRow.created_by}. Only they can change or delete it.`
                  : "Type and goal cannot be edited after creation. To change these, please delete this transaction and create a new one."}
              </Alert>
            )}
            {lockReason === "contributing" && (
              <Alert severity="info">
                {draft.entry_type === "withdraw"
                  ? "Withdrawing from"
                  : "Contributing to"}{" "}
                {selectedGoal?.name ?? "this goal"}. To record something else,
                add a transaction from the Transactions page.
              </Alert>
            )}

            {isTransfer ? (
              <>
                <TransferDirection
                  value={draft.entry_type as Direction}
                  onChange={(direction) => set("entry_type", direction)}
                  disabled={editing}
                />
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
                    onChange={(e) => {
                      if (e.target.value === "new") setCreatingGoal(true);
                      else set("goal", Number(e.target.value));
                    }}
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
                    {goals.filter(canTransfer).length === 0 && (
                      <MenuItem disabled value="">
                        No goals yet.
                      </MenuItem>
                    )}
                    <MenuItem
                      value="new"
                      sx={{ color: "primary.dark", fontWeight: 600 }}
                    >
                      <AddIcon fontSize="small" sx={{ mr: 1 }} />
                      New goal…
                    </MenuItem>
                    {goals
                      .filter((g) => canTransfer(g))
                      .map((g) => (
                        <MenuItem key={g.id} value={g.id}>
                          <Box sx={{ fontWeight: 700 }}>{g.name}</Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ ml: "auto", pl: 3 }}
                          >
                            €{displayAmount(g.balance)} / €
                            {displayAmount(g.target_amount)}
                          </Typography>
                        </MenuItem>
                      ))}
                  </TextField>
                </FieldLabel>
              </>
            ) : (
              <FieldLabel
                label="Category"
                htmlFor="transaction-category"
                id="transaction-category-label"
              >
                <TextField
                  disabled={foreign}
                  id="transaction-category"
                  select
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
                          options.find((c) => c.id === value)?.name
                        ),
                    },
                  }}
                  required
                >
                  {options.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
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
                disabled={foreign}
                value={draft.amount}
                onChange={(amount) => set("amount", amount)}
                placeholder="0,00"
                required
                slotProps={{ input: amountAdornment }}
              />
            </FieldLabel>

            {isExpense && (
              <GoalSpendField
                goals={spendableGoals}
                value={draft.goal}
                onChange={(g) => set("goal", g)}
                amount={draft.amount}
                expanded={payingFromGoal}
                onExpand={() => setPayingFromGoal(true)}
                onRemove={() => {
                  set("goal", null);
                  setPayingFromGoal(false);
                }}
                disabled={locked}
              />
            )}

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
                disabled={foreign}
                casing="name"
                value={draft.description}
                onChange={(description) => set("description", description)}
                placeholder={
                  isTransfer
                    ? (selectedGoal?.name ?? "")
                    : isExpense
                      ? "e.g. Accidentally bought a boat"
                      : "e.g. Found coins in winter coat"
                }
                required={!isTransfer}
              />
            </FieldLabel>

            <FieldLabel
              label="Date"
              htmlFor="transaction-date"
              id="transaction-date-label"
            >
              <IsoDatePicker
                labelId="transaction-date-label"
                disabled={foreign}
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
          {editing && !foreign && (
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
              {foreign ? "Close" : "Cancel"}
            </Button>
            {!foreign && (
              <Button
                type="submit"
                variant="contained"
                // Nothing to save on an untouched edit.
                disabled={saving || (editing && !guard.hasUnsavedChanges)}
              >
                {editing
                  ? saving
                    ? "Saving…"
                    : "Save changes"
                  : saving
                    ? "Adding…"
                    : "Add"}
              </Button>
            )}
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
      <GoalForm
        open={creatingGoal}
        onClose={() => setCreatingGoal(false)}
        onSaved={(g) => {
          setGoalsVersion((v) => v + 1);
          set("goal", g.id);
        }}
      />
    </ModalShell>
  );
}
