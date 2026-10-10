/** @file Modal for setting the personal workspace's starting balance. */

import { useState } from "react";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  InputAdornment,
  Stack,
} from "@mui/material";
import { ModalShell } from "./ModalShell";
import { FieldLabel } from "../Form/FieldLabel";
import { MoneyField } from "../Form/MoneyField/MoneyField";
import { useToast } from "../../context/useToast";
import { getCsrfToken } from "../../lib/csrf";
import { submitInitialBalance } from "../../lib/initialBalance";
import { validateOpeningBalance } from "../../lib/money";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const amountAdornment = {
  startAdornment: (
    <InputAdornment position="start" disableTypography>
      €
    </InputAdornment>
  ),
};

export function StartingBalanceForm({ open, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /** Seeds a blank form on open; the modal stays mounted between openings. */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAmount("");
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const problem = validateOpeningBalance(amount);
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setSaving(true);
    try {
      const result = await submitInitialBalance(amount, getCsrfToken());
      if (!result.ok) {
        setError(result.error ?? "Could not save the starting balance.");
        return;
      }
      onSaved?.();
      onClose();
      showToast("Starting balance saved");
    } catch {
      setError("Could not save the starting balance. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell open={open} title="Set starting balance" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            <FieldLabel label="Amount" htmlFor="starting-balance">
              <MoneyField
                id="starting-balance"
                value={amount}
                onChange={setAmount}
                placeholder="0,00"
                required
                autoFocus
                slotProps={{ input: amountAdornment }}
              />
            </FieldLabel>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </form>
    </ModalShell>
  );
}
