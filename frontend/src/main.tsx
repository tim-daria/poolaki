import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { router } from "./routes.tsx";
import { theme } from "./theme.ts";
import { AuthProvider } from "./context/AuthContext.tsx";
import "./index.css";

// Start MSW mock server in development mode).
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import("./mocks/browser.ts");
    return worker.start({ onUnhandledRequest: "bypass" });
  }
}

enableMocking().then(() => { // mock server
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  );
});//mock server
