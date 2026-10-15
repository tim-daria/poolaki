/** @file Modal for changing the signed-in user's password through allauth. */

import { useState } from "react";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
} from "@mui/material";
import { PasswordChangeError, changePassword } from "../../lib/account";
import { getCsrfToken } from "../../lib/csrf";
import { useToast } from "../../context/useToast";
import { ModalShell } from "./ModalShell";
import { DiscardChangesDialog } from "./CloseGuard";
import { useCloseGuard } from "./useCloseGuard";

interface Props {
  open: boolean;
  onClose: () => void;
}

const BLANK = { current: "", next: "", confirm: "" };

export function ChangePasswordForm({ open, onClose }: Props) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState(BLANK);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const guard = useCloseGuard(draft, onClose);

  function handleExited() {
    setDraft(BLANK);
    setError("");
    setSubmitting(false);
    guard.reset(BLANK);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    // Checked here because allauth takes a single new_password and would
    // happily save a typo.
    if (draft.next !== draft.confirm) {
      setError("New passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(draft.current, draft.next, getCsrfToken());
      setSubmitting(false);
      onClose();
      showToast("Password changed");
    } catch (err) {
      setError(
        err instanceof PasswordChangeError
          ? err.message
          : "Can't reach the server. Check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  const field = (key: keyof typeof BLANK) => ({
    value: draft[key],
    onChange: (e: { target: { value: string } }) =>
      setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  return (
    <ModalShell
      open={open}
      title="Change password"
      onClose={guard.requestClose}
      onExited={handleExited}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              fullWidth
              {...field("current")}
            />
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              fullWidth
              {...field("next")}
            />
            <TextField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              fullWidth
              {...field("confirm")}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={guard.requestClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Saving…" : "Change password"}
          </Button>
        </DialogActions>
      </form>

      <DiscardChangesDialog
        guard={guard}
        message="Your new password has not been saved. Closing now will lose what you entered."
      />
    </ModalShell>
  );
}
