import { Dialog, DialogTitle, IconButton } from "@mui/material";
import Close from "@mui/icons-material/Close";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  /**
   * Fires once the dialog has finished fading out. A form that stays mounted
   * clears itself here, so the reset is invisible instead of happening
   * mid-animation.
   */
  onExited?: () => void;
  children: React.ReactNode;
}

/**
 * Shell component using behavior of MUI's Dialog -
 * will be used by all other modal windows,
 * stored in the same folder.
 */
export function ModalShell({
  open,
  title,
  onClose,
  onExited,
  children,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ transition: { onExited } }}
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
