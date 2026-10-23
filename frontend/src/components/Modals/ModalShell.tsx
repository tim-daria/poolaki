/**
 * @file Frame shared by every modal in this folder: title, close button, and
 * focus restore after the exit animation. A bottom sheet below the nav
 * breakpoint, a centred dialog above it.
 */

import { useId } from "react";
import { Dialog, DialogTitle, Drawer, IconButton } from "@mui/material";
import Close from "@mui/icons-material/Close";
import { useRestoreFocus } from "../../hooks/useRestoreFocus";
import { useBottomSheet } from "../../hooks/useSheet";

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
  // Fit mode: every form has a known end, like the filters.
  const { sheet, paperSx } = useBottomSheet(true);
  // Explicit: outside a Dialog, DialogTitle gets no id from context.
  const titleId = useId();

  function handleExited() {
    onExited?.();
    restoreFocus();
  }

  const header = (
    <DialogTitle id={titleId}>
      {title}
      <IconButton onClick={onClose} aria-label="close">
        <Close />
      </IconButton>
    </DialogTitle>
  );

  if (sheet) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        // MUI would restore focus before the slide-out ends; handleExited does it.
        disableRestoreFocus
        slotProps={{
          transition: { onExited: handleExited },
          paper: {
            // The Drawer paper is already role="dialog"; the title names it.
            "aria-labelledby": titleId,
            sx: {
              ...paperSx,
              // The MuiDialog paper inset, which a Drawer paper does not get,
              // plus the home indicator under the sheet.
              p: 1,
              pb: (theme) =>
                `calc(${theme.spacing(1)} + env(safe-area-inset-bottom))`,
            },
          },
        }}
      >
        {header}
        {children}
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby={titleId}
      // MUI would restore focus before the fade-out ends; handleExited does it.
      disableRestoreFocus
      slotProps={{ transition: { onExited: handleExited } }}
    >
      {header}
      {children}
    </Dialog>
  );
}
