import { Outlet, useNavigate, NavLink, useParams } from "react-router";
import { useAuth } from "../context/useAuth";
import { getCsrfToken } from "../lib/csrf";
import { Header } from "./Header/Header";
import "../App.css";

interface AppLayoutProps {
  /** True while the backend session is catching up to the URL's workspace. */
  syncing: boolean;
}

/**
 * Main application layout housing the persistent Header and Navigation sidebar.
 *
 * Key behaviors:
 * - Relative Routing: NavLinks use relative paths (e.g., `to="transactions"` or `to="."`)
 *   to automatically resolve against `/o/:orgId` without manually passing `orgId`.
 * - Exact Index Matching: The `end` prop on `to="."` ensures "Overview" is highlighted
 *   only when at the root route, avoiding false active states on sub-pages.
 * - State Reset via `key={orgId}`: Bound to `<main>`, changing `orgId` forces React
 *   to remount only the page content (<Outlet />), automatically clearing old filters,
 *   scroll position, and stale data while keeping the shell UI mounted smoothly.
 */
export function AppLayout({ syncing }: AppLayoutProps) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { orgId } = useParams();

  async function handleLogout() {
    await fetch("/_allauth/browser/v1/auth/session", {
      method: "DELETE",
      headers: { "X-CSRFToken": getCsrfToken() },
      credentials: "include",
    });
    setUser(null);
    navigate("/login");
  }

  return (
    <div className="appContainer">
      <Header onLogout={handleLogout} />
      <nav>
        {/* <h2>Poolaki</h2> */}
        <ul>
          <li></li>
          {/* Relative links resolve against /o/:orgId, so they follow the
              current workspace without threading orgId through props. */}
          <li>
            {/* `end` — otherwise "." matches every page under /o/:orgId */}
            <NavLink to="." end>
              Overview
            </NavLink>
          </li>
          <li>
            <NavLink to="transactions">Transactions</NavLink>
          </li>
          <li>
            <NavLink to="goals">Goals</NavLink>
          </li>
          <li>
            <NavLink to="categories">Categories</NavLink>
          </li>
          <li className="spacer"></li>
          {/* <li>
            <NavLink to="settings">Settings</NavLink>
          </li> */}
        </ul>
        <div className="nav-footer"></div>
      </nav>
      <main key={orgId} style={{ gridArea: "main", overflowY: "auto" }}>
        {/* waits on the session bridge; see OrgLayout*/}
        {syncing ? <div>Loading…</div> : <Outlet />}
      </main>
    </div>
  );
}
