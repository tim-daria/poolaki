/**
 * @file The route tree. Each lazy page is its own code-split chunk and exports
 * its component as `Component`, which react-router picks up.
 *
 * `handle` carries the page's title and subtitle, feeding both the browser tab
 * and <PageTitle> — see routeMeta.ts.
 */

import { createBrowserRouter } from "react-router";
import { App } from "./App";
import { GuestRoute } from "./components/GuestRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OrgListProvider } from "./context/OrgListProvider";
import { NotificationProvider } from "./context/NotificationProvider";
import { OrgLayout } from "./components/OrgLayout";
import { OrgRedirect } from "./components/OrgRedirect";
import { ErrorPage } from "./pages/ErrorPage/ErrorPage";

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
          {
            path: "login",
            handle: { title: "Sign in" },
            lazy: () => import("./pages/Login/Login"),
          },
          {
            path: "register",
            handle: { title: "Create account" },
            lazy: () => import("./pages/Register/Register"),
          },
          // { path: "about", element: <About /> },
        ],
      },
      // Outside GuestRoute: the Sidebar links here, and GuestRoute would
      // bounce a signed-in user straight back to their workspace.
      {
        path: "terms",
        handle: { title: "Terms" },
        lazy: () => import("./pages/LegalPages/Terms"),
      },
      {
        path: "policy",
        handle: { title: "Privacy Policy" },
        lazy: () => import("./pages/LegalPages/Policy"),
      },
      {
        path: "oauth-callback",
        lazy: () => import("./pages/OAuthCallback/OAuthCallback"),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            // Pathless layout route: adds the provider without a URL segment.
            // Inside ProtectedRoute, so the org list unmounts on logout.
            element: <OrgListProvider />,
            children: [
              {
                // Pathless for the same reason: app-wide, and unmounted on logout.
                element: <NotificationProvider />,
                children: [
                  // "/" resolves the last-used workspace and redirects to it.
                  { index: true, element: <OrgRedirect /> },
                  {
                    // The org lives in the URL, so everything below is scoped
                    // to it and switching workspaces is just navigation.
                    path: "o/:orgId",
                    element: <OrgLayout />,
                    children: [
                      {
                        index: true,
                        // Names the tab only: Home renders its own heading, a
                        // greeting or the member list.
                        handle: { title: "Home" },
                        lazy: () => import("./pages/Home/Home"),
                      },
                      {
                        path: "transactions",
                        handle: {
                          title: "Transactions",
                          subtitle:
                            "Track and manage your daily income and expenses",
                        },
                        lazy: () => import("./pages/Transactions/Transactions"),
                      },
                      {
                        path: "savings",
                        handle: {
                          title: "Savings",
                          subtitle:
                            "Create, manage, and achieve your savings goals",
                        },
                        lazy: () => import("./pages/Goals/Goals"),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
