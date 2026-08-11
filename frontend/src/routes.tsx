import { createBrowserRouter } from "react-router";
import { App } from "./App";
import { GuestRoute } from "./components/GuestRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OrgListProvider } from "./context/OrgListProvider";
import { OrgLayout } from "./components/OrgLayout";
import { OrgRedirect } from "./components/OrgRedirect";
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
          // { path: "about", element: <About /> },
        ],
      },
      // Outside GuestRoute: the Sidebar links here, and GuestRoute would
      // bounce a signed-in user straight back to their workspace.
      { path: "terms", lazy: () => import("./pages/LegalPages/Terms") },
      { path: "policy", lazy: () => import("./pages/LegalPages/Policy") },
      {
        path: "oauth-callback",
        lazy: () => import("./pages/OAuthCallback/OAuthCallback"),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            // Pathless layout route: adds the provider to the tree without
            // adding a URL segment. Sits inside ProtectedRoute so the org list
            // unmounts on logout. Renders <Outlet/> for its children.
            element: <OrgListProvider />,
            children: [
              // "/" resolves the last-used workspace and redirects to it.
              { index: true, element: <OrgRedirect /> },
              {
                // The org lives in the URL. Everything below is scoped to it,
                // and switching workspaces is just navigation.
                path: "o/:orgId",
                element: <OrgLayout />,
                children: [
                  {
                    index: true,
                    lazy: () => import("./pages/Home/Home"),
                  },
                  {
                    path: "transactions",
                    lazy: () => import("./pages/Transactions/Transactions"),
                  },
                  {
                    path: "goals",
                    lazy: () => import("./pages/Goals/Goals"),
                  },
                  {
                    path: "categories",
                    lazy: () => import("./pages/Categories/Categories"),
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
