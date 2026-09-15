/**
 * @file One Snackbar for the whole app, so every modal confirms success the
 * same way instead of each rendering its own.
 */

import { useState, type ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";
import { ToastContext } from "./ToastContext";

/** Long enough to read, short enough not to need dismissing. */
const AUTO_HIDE_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Kept after close so the text does not blank out during the fade.
  const [message, setMessage] = useState("");

  const showToast = (next: string) => {
    setMessage(next);
    setOpen(true);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={AUTO_HIDE_MS}
        // Click-away is ignored: the toast is not a dialog, so clicking the
        // page should not be what closes it.
        onClose={(_, reason) => reason !== "clickaway" && setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
