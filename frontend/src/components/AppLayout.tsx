import { Outlet, useNavigate, useMatches, NavLink } from "react-router";
import { useAuth } from "../context/useAuth";
import { getCsrfToken } from "../lib/csrf";
import { Header } from "./Header/Header";
import "../App.css";

export function AppLayout() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const matches = useMatches();
  const pageTitle = matches.findLast(
    (m) => (m.handle as { title?: string })?.title,
  )?.handle as { title: string } | undefined;

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
      <Header title={pageTitle?.title ?? ""} onLogout={handleLogout} />
      <nav>
        {/* <h2>Poolaki</h2> */}
        <ul>
          <li></li>
          {/* NavLink can be styled when active, too */}
          <li>
            <NavLink to="/">Overview</NavLink>
          </li>
          <li>
            <NavLink to="/transactions">Transactions</NavLink>
          </li>
          <li>
            <NavLink to="/goals">Goals</NavLink>
          </li>
          <li>
            <NavLink to="/categories">Categories</NavLink>
          </li>
          <li className="spacer"></li>
          <li>
            <NavLink to="/settings">Settings</NavLink>
          </li>
        </ul>
        <div className="nav-footer"></div>
      </nav>
      <main style={{ gridArea: "main", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
