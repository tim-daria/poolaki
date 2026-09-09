import { useState } from "react";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
} from "@mui/material";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import {
  InvitationCreateError,
  createInvitation,
} from "../../lib/organizations";
import { getCsrfToken } from "../../lib/csrf";
import { useToast } from "../../context/useToast";
import { ModalShell } from "./ModalShell";
import { DiscardChangesDialog } from "./CloseGuard";
import { useCloseGuard } from "./useCloseGuard";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Fires after a successful send, so the caller can refetch its member list. */
  onSent: () => void;
}

/**
 * Modal dialog for inviting an existing user to the current workspace.
 *
 * Key behavior & ordering:
 * - No Membership yet: the backend only creates a pending Invitation and
 *   notifies the invitee. They appear as a member once they accept, which is
 *   why the caller refetches pending invitations and not just members.
 * - Rejected input keeps the dialog open: unknown username, already a member,
 *   already invited and workspace-full all come back as 400s carrying a
 *   message meant for the user. Closing on those would make them retype.
 *
 * NOTE: only the owner may invite, and only into a shared workspace. The
 * caller is expected to hide the entry point otherwise — reaching this form
 * without those rights gets a 403 that has no useful message for the user.
 */
export function InvitationForm({ open, onClose, onSent }: Props) {
  const org = useCurrentOrg();
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Asks before throwing away a half-typed username. The guard snapshots the
   * draft on mount and compares. Esc and the backdrop are covered too, since
   * ModalShell routes both through the onClose it is given.
   */
  const guard = useCloseGuard({ username }, onClose);

  /**
   * Wipes the form once the dialog has faded out, so reopening it never shows
   * the name that was just invited. Waiting for the fade to finish is the
   * point: clearing on close would blank the field in view.
   */
  function handleExited() {
    setUsername("");
    setError("");
    setSubmitting(false);
    // The guard snapshotted the old value, so a blank form would otherwise
    // read as unsaved work. Passed explicitly — the setState calls above have
    // not landed yet.
    guard.reset({ username: "" });
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter a username");
      return;
    }

    setSubmitting(true);
    try {
      await createInvitation(org.id, trimmed, getCsrfToken());
      // Not just in the catch: this component outlives the close, so a flag
      // left true here would disable both buttons on the next open.
      setSubmitting(false);
      // Before the close, so the avatar row has the new pending entry by the
      // time the dialog is gone.
      onSent();
      onClose();
      showToast(`Invitation sent to ${trimmed}`);
    } catch (err) {
      // A 400 is the user's input, not a failure: show what the backend said
      // and stay open so the username can be corrected in place.
      setError(
        err instanceof InvitationCreateError
          ? err.message
          : "Failed to send the invitation. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title="Invite a member"
      onClose={guard.requestClose}
      onExited={handleExited}
    >
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jdoe"
              required
              autoFocus
              fullWidth
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        {/* Cancel first, Send on the right — same order as the transaction
            form, and the emphasised button sits where the eye lands last. */}
        <DialogActions>
          <Button onClick={guard.requestClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Sending…" : "Send invitation"}
          </Button>
        </DialogActions>
      </form>

      <DiscardChangesDialog
        guard={guard}
        message="This invitation has not been sent yet. Closing now will lose what you entered."
      />
    </ModalShell>
  );
}
