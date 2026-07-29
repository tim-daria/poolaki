import { createBrowserRouter } from "react-router";
import { App } from "./App";
import { AppLayout } from "./components/AppLayout";
import { GuestRoute } from "./components/GuestRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { InitialBalanceGate } from "./components/InitialBalancrGate";
import { ErrorPage } from "./pages/ErrorPage/ErrorPage";

// Each lazy page is its own code-split chunk, loaded on first navigation.
// Pages export their component as `Component`, which react-router picks up.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: <div>Loading…</div>,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: "login", lazy: () => import("./pages/Login/Login") },
          { path: "register", lazy: () => import("./pages/Register/Register") },
          { path: "terms", lazy: () => import("./pages/LegalPages/Terms") },
          { path: "policy", lazy: () => import("./pages/LegalPages/Policy") },
          // { path: "about", element: <About /> },
        ],
      },
      {
        path: "oauth-callback",
        lazy: () => import("./pages/OAuthCallback/OAuthCallback"),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: (
              <InitialBalanceGate>
                <AppLayout />
              </InitialBalanceGate>
            ),
            children: [
              {
                index: true,
                lazy: () => import("./pages/Home/Home"),
                handle: { title: "Overview" },
              },
              {
                path: "transactions",
                lazy: () => import("./pages/Transactions/Transactions"),
                handle: { title: "Transactions" },
              },
              {
                path: "goals",
                lazy: () => import("./pages/Goals/Goals"),
                handle: { title: "Goals" },
              },
              {
                path: "categories",
                lazy: () => import("./pages/Categories/Categories"),
                handle: { title: "Categories" },
              },
            ],
          },
        ],
      },
    ],
  },
]);
