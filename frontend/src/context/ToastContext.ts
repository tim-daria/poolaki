/** @file Context for the app-wide success toast; see ToastProvider. */

import { createContext } from "react";

export type ToastContextType = {
  /** Shows a short confirmation at the bottom of the screen; it hides itself. */
  showToast: (message: string) => void;
};

export const ToastContext = createContext<ToastContextType | null>(null);
