import { Outlet, useNavigate, useMatches } from "react-router";
import { useAuth } from "../context/useAuth";
import { getCsrfToken } from "../lib/csrf";
import Header from "./Header/Header";
import "../App.css";

export default function AppLayout() {
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
          <li>Overview</li>
          <li>Transactions</li>
          <li>Goals</li>
          <li>Categories</li>
          <div></div>
          <li>Settings</li>
        </ul>
        <div className="nav-footer">
          <a href="/about">About Us</a>
          <a href="/terms">Terms of Use</a>
        </div>
      </nav>
      <main style={{ gridArea: "main", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
