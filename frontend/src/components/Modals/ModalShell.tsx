/**
 * @file Dialog frame shared by every modal in this folder: title, close
 * button, and focus restore after the fade-out.
 */

import { Dialog, DialogTitle, IconButton } from "@mui/material";
import Close from "@mui/icons-material/Close";
import { useRestoreFocus } from "../../hooks/useRestoreFocus";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  /**
   * Fires once the dialog has finished fading out. A form that stays mounted
   * clears itself here, so the reset is not visible mid-animation.
   */
  onExited?: () => void;
  children: React.ReactNode;
}

export function ModalShell({
  open,
  title,
  onClose,
  onExited,
  children,
}: Props) {
  const restoreFocus = useRestoreFocus(open);

  function handleExited() {
    onExited?.();
    restoreFocus();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      // MUI would restore focus before the fade-out ends; handleExited does it.
      disableRestoreFocus
      slotProps={{ transition: { onExited: handleExited } }}
    >
      <DialogTitle>
        {title}
        <IconButton onClick={onClose} aria-label="close">
          <Close />
        </IconButton>
      </DialogTitle>
      {children}
    </Dialog>
  );
}
