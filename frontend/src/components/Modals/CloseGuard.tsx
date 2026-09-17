import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import type { CloseGuard } from "./useCloseGuard";
import { useRestoreFocus } from "../../hooks/useRestoreFocus";

interface DialogProps<T> {
  guard: CloseGuard<T>;
  /** Override when "changes" is the wrong word — an invitation, say. */
  message?: string;
}

/**
 * Renders inside the form's own dialog, so the form stays visible behind it:
 * the answer to "discard?" is easier when you can see what you typed.
 */
export function DiscardChangesDialog<T>({ guard, message }: DialogProps<T>) {
  // Stacked on the form's dialog, so focus has to move out of and back into
  // a subtree MUI hides — see the hook.
  const restoreFocus = useRestoreFocus(guard.confirming);

  return (
    <Dialog
      open={guard.confirming}
      onClose={guard.keepEditing}
      maxWidth="xs"
      disableRestoreFocus
      slotProps={{ transition: { onExited: restoreFocus } }}
    >
      {/* The theme spreads dialog titles apart for the title/close-button
          pairing; this one has no close button, so it re-centers. */}
      <DialogTitle sx={{ justifyContent: "center" }}>
        Discard changes?
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ textAlign: "center" }}>
          {message ?? "You have unsaved changes. Closing now will lose them."}
        </Typography>
      </DialogContent>
      {/* Keep editing is the safe default, so it carries the emphasis and
          Discard stays muted — the reverse invites an accidental discard. */}
      <DialogActions sx={{ justifyContent: "center" }}>
        <Button variant="outlined" color="error" onClick={guard.discard}>
          Discard
        </Button>
        <Button variant="contained" onClick={guard.keepEditing}>
          Keep editing
        </Button>
      </DialogActions>
    </Dialog>
  );
}
