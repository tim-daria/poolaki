import { useNavigate } from "react-router";
import { useAuth } from "./useAuth";
import { getCsrfToken } from "../lib/csrf";

/**
 * Ends the session on the server, then clears it locally.
 *
 * The DELETE is the actual logout: dropping the client-side user alone would
 * leave the session cookie valid, so a reload would sign straight back in.
 * Order matters — `setUser(null)` unmounts everything behind ProtectedRoute,
 * so it has to come after the request that needs the session's CSRF token.
 */
export function useLogout() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  return async function logout() {
    await fetch("/_allauth/browser/v1/auth/session", {
      method: "DELETE",
      headers: { "X-CSRFToken": getCsrfToken() },
      credentials: "include",
    });
    setUser(null);
    navigate("/login");
  };
}
