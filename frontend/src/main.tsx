/** @file Entry point. Mounts the app with theme, date, toast, auth and router providers. */

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { router } from "./routes.tsx";
import { theme } from "./theme.ts";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ToastProvider } from "./context/ToastProvider.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </StrictMode>,
);
