/** @file Confirmation prompt for a destructive action, shared by every modal. */

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { useRestoreFocus } from "./useRestoreFocus";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** Also invoked by Esc and the backdrop. */
  onCancel: () => void;
  cancelLabel?: string;
  /** Disables both buttons while the confirmed action is in flight. */
  busy?: boolean;
}

/** Render inside the dialog whose action it confirms, so that form stays visible behind it. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  cancelLabel = "Cancel",
  busy = false,
}: Props) {
  // Stacking on the parent dialog marks it aria-hidden, so focus must be
  // restored after the fade-out rather than on close.
  const restoreFocus = useRestoreFocus(open);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      disableRestoreFocus
      slotProps={{ transition: { onExited: restoreFocus } }}
    >
      {/* Overrides the theme's title/close-button spread; there is no close button. */}
      <DialogTitle sx={{ justifyContent: "center" }}>{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ textAlign: "center" }}>{message}</Typography>
      </DialogContent>
      {/* Emphasis goes on backing out; the destructive button stays muted. */}
      <DialogActions sx={{ justifyContent: "center" }}>
        <Button
          variant="outlined"
          color="error"
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </Button>
        <Button variant="contained" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
