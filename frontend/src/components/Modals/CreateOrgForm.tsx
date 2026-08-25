import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
} from "@mui/material";
import { useOrgList } from "../../context/useOrgList";
import { createOrganization } from "../../lib/organizations";
import { getCsrfToken } from "../../lib/csrf";
import { ModalShell } from "./ModalShell";
import { DiscardChangesDialog, useCloseGuard } from "./CloseGuard";

interface Props {
  open: boolean;
  onClose: () => void;
}
/**
 * Modal dialog for creating a new shared workspace with an initial balance.
 *
 * Key behavior & ordering:
 * - Client Validation: Validates non-empty name and non-negative balance before submitting.
 * - Essential Refetch Order: Calls `refresh()` to update the global organization list
 *   BEFORE navigating to `/o/${org.id}`. Navigating first would cause `OrgLayout`
 *   to fail its lookup and temporarily render `NoAccessScreen` for the newly created workspace.
 *
 * NOTE: Duplicate workspace names are currently allowed on the backend.
 * The personal workspace name can have doubles, too.
 */
export function CreateOrgForm({ open, onClose }: Props) {
  const { refresh } = useOrgList();
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  /**
   * Asks before throwing away a half-filled form. Both fields go in as one
   * object so a change to either counts; the guard snapshots it on mount and
   * compares. Esc and the backdrop are covered too, since ModalShell routes
   * both through the onClose it is given.
   */
  const guard = useCloseGuard({ name, balance }, onClose);

  /**
   * Wipes the form once the dialog has faded out, so reopening it never shows
   * the workspace that was just created. Waiting for the fade to finish is the
   * point: clearing on close would blank the fields in view.
   */
  function handleExited() {
    setName("");
    setBalance("");
    setError("");
    setSubmitting(false);
    // The guard snapshotted the old values, so a blank form would otherwise
    // read as unsaved work. Passed explicitly — the setState calls above have
    // not landed yet.
    guard.reset({ name: "", balance: "" });
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a workspace name");
      return;
    }
    const parsed = parseFloat(balance);
    if (isNaN(parsed) || parsed < 0) {
      setError("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const org = await createOrganization(trimmed, parsed, getCsrfToken());
      // Refresh before navigating: OrgLayout resolves the org out of the list,
      // so navigating first shows NoAccessScreen for the workspace we just made.
      await refresh();
      // Not just in the catch: this component outlives the close, so a flag
      // left true here would disable both buttons on the next open.
      setSubmitting(false);
      // Close explicitly. The header stays mounted across a workspace switch,
      // so navigating alone will not unmount this.
      onClose();
      navigate(`/o/${org.id}`);
    } catch {
      setError("Failed to create workspace. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title="Create shared workspace"
      onClose={guard.requestClose}
      onExited={handleExited}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Flat share"
              required
              autoFocus
              fullWidth
            />

            <TextField
              label="Initial balance (€)"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
              required
              fullWidth
              // min 0, not 0.01 as on a transaction amount: a workspace is
              // allowed to start empty.
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        {/* Cancel first, Create on the right — same order as the transaction
            form, and the emphasised button sits where the eye lands last. */}
        <DialogActions>
          <Button onClick={guard.requestClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </form>

      <DiscardChangesDialog
        guard={guard}
        message="This workspace has not been created yet. Closing now will lose what you entered."
      />
    </ModalShell>
  );
}
