/** @file Context for the app-wide toast; see ToastProvider. */

import { createContext } from "react";

export type ToastSeverity = "success" | "error";

export type ToastContextType = {
  /**
   * Shows a short notice at the bottom of the screen; it hides itself.
   * Defaults to success; pass "error" for a failed request.
   */
  showToast: (message: string, severity?: ToastSeverity) => void;
};

export const ToastContext = createContext<ToastContextType | null>(null);
