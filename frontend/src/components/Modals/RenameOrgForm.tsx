/** @file Modal for renaming a shared workspace; owner only. */

import { useState } from "react";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
} from "@mui/material";
import {
  MAX_ORG_NAME_LENGTH,
  type Organization,
  WorkspaceRequestError,
  renameOrganization,
} from "../../lib/organizations";
import { getCsrfToken } from "../../lib/csrf";
import { useOrgList } from "../../context/useOrgList";
import { useToast } from "../../context/useToast";
import { ModalShell } from "./ModalShell";
import { DiscardChangesDialog } from "./CloseGuard";
import { useCloseGuard } from "./useCloseGuard";

interface Props {
  open: boolean;
  onClose: () => void;
  org: Pick<Organization, "id" | "name">;
}

export function RenameOrgForm({ open, onClose, org }: Props) {
  const { refresh } = useOrgList();
  const { showToast } = useToast();
  const [name, setName] = useState(org.name);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const guard = useCloseGuard(name, onClose);

  function handleExited() {
    setName(org.name);
    setError("");
    setSubmitting(false);
    guard.reset(org.name);
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a workspace name");
      return;
    }
    if (trimmed.length > MAX_ORG_NAME_LENGTH) {
      setError(`Keep the name under ${MAX_ORG_NAME_LENGTH} characters`);
      return;
    }

    setSubmitting(true);
    try {
      const renamed = await renameOrganization(org.id, trimmed, getCsrfToken());
      // The switcher, the page title and the Settings list all read the org
      // list, so one refresh updates every place the name shows.
      await refresh();
      setSubmitting(false);
      onClose();
      showToast(`Workspace renamed to "${renamed.name}"`);
    } catch (err) {
      setError(
        err instanceof WorkspaceRequestError
          ? err.message
          : "Failed to rename the workspace. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      title="Rename workspace"
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
              required
              autoFocus
              fullWidth
              slotProps={{ htmlInput: { maxLength: MAX_ORG_NAME_LENGTH } }}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={guard.requestClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !guard.hasUnsavedChanges}
          >
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </form>

      <DiscardChangesDialog
        guard={guard}
        message="The new name has not been saved. Closing now will lose it."
      />
    </ModalShell>
  );
}
