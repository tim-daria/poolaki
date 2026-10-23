/**
 * @file One Snackbar for the whole app, so every modal reports success or
 * failure the same way instead of each rendering its own.
 */

import { useState, type ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";
import { ToastContext, type ToastSeverity } from "./ToastContext";

/** Long enough to read, short enough not to need dismissing. */
const AUTO_HIDE_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Kept after close so the text and colour do not change during the fade.
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<ToastSeverity>("success");
  // Bumped per toast and used as the Snackbar's key: MUI starts the auto-hide
  // timer when `open` turns true, not when the message changes, so a toast
  // that replaces one still showing would otherwise inherit its remaining
  // time and could disappear almost at once. A new key remounts the Snackbar
  // and gives every message the full duration.
  const [toastId, setToastId] = useState(0);

  const showToast = (next: string, nextSeverity: ToastSeverity = "success") => {
    setMessage(next);
    setSeverity(nextSeverity);
    setToastId((id) => id + 1);
    setOpen(true);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        key={toastId}
        open={open}
        autoHideDuration={AUTO_HIDE_MS}
        // Click-away is ignored: the toast is not a dialog, so clicking the
        // page should not be what closes it.
        onClose={(_, reason) => reason !== "clickaway" && setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={severity}
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
