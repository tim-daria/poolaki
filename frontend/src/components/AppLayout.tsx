import { Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";
import { getCsrfToken } from "../lib/csrf";
import "../App.css";

export default function AppLayout() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

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
      <header>
        <span>Page Name</span>
        <button>Notifications</button>
      </header>
      <nav>
        <ul>
          <li>Home</li>
          <li>Transactions</li>
          <li>Goals</li>
          <li>Categories</li>
          <div>--------</div>
          <li>Recurring</li>
          <li>Settings</li>
        </ul>
        <div className="user-avatar">
          <img src="" alt="User Avatar" />
          <span>Username</span>
          <a onClick={handleLogout} style={{ cursor: "pointer" }}>
            Logout
          </a>
        </div>
      </nav>
      <main style={{ gridArea: "main", overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
