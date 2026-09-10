import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../context/useAuth";
import { getCsrfToken } from "../../lib/csrf";
import { parseAllauthErrors, type AllauthError } from "../../lib/authErrors";
import { startSocialAuth } from "../../lib/socialAuth";
import { submitInitialBalance } from "../../lib/initialBalance";
import type { User } from "../../context/AuthContext";
import styles from "./styles.module.css";

/**
 * Email/password signup, plus the entry point for 42 OAuth.
 *
 * Signing up takes two requests, not one. allauth's headless endpoint accepts
 * only the fields in ACCOUNT_SIGNUP_FIELDS, so the optional starting balance is
 * sent afterwards, once a session exists. That ordering is safe because a
 * backend signal creates the personal workspace during signup with a balance of
 * €0 — the second request overwrites a working default rather than completing
 * the account, which is why it's optional and why failing it isn't fatal.
 *
 * Note that 42 signups never reach this form; they go through /oauth-callback,
 * so those users keep the €0 default and currently have no way to change it.
 *
 * TODO: Settings page with a possibility to change initial balance.
 */
function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    // Ensure the CSRF cookie is set for unauthenticated users
    void fetch("/api/v1/csrf/", { credentials: "include" });
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }

    const res = await fetch("/_allauth/browser/v1/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      credentials: "include",
      body: JSON.stringify({
        username,
        email,
        password,
        password2,
      }),
    });

    let data: { data?: { user: User }; errors?: AllauthError[] } | null = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON body, e.g. an HTML error page from a 500.
    }

    // Requires a user in the body, not merely a 2xx: the balance call below
    // needs an authenticated session, and the user object is what confirms one.
    if (res.ok && data?.data?.user) {
      // Best-effort — the workspace already exists at €0.
      if (balance.trim() !== "") {
        const balanceRes = await submitInitialBalance(balance, getCsrfToken());
        if (!balanceRes.ok) {
          console.warn("Could not set the starting balance:", balanceRes.error);
        }
      }
      setUser(data.data.user);
      navigate("/");
    } else {
      const msg = parseAllauthErrors(
        data?.errors,
        "Login failed. Please check your credentials.",
      );
      setError(msg);
    }
  }

  return (
    <div className={styles.helloPage}>
      <div className={styles.formContainer}>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
        <h1>Sign Up</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          ></input>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          ></input>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label htmlFor="password2">Confirm Password</label>
          <input
            id="password2"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
          <label htmlFor="balance">Starting balance (€) — optional</label>
          <input
            id="balance"
            type="number"
            min="0"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            aria-describedby="balance-hint"
          />
          <small id="balance-hint">
            Leave empty to start at €0. You can change this later.
          </small>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn}>
            Sign Up
          </button>
        </form>
        <div className={styles.divider}>or</div>
        <button
          type="button"
          className={styles.oauthBtn}
          onClick={() =>
            startSocialAuth(
              "intra42",
              "login",
              "/oauth-callback?flow=signup",
              getCsrfToken(),
            )
          }
        >
          Sign Up with 42
        </button>
        <p>
          By creating an account, you accept our{" "}
          <Link to="/policy">Privacy Policy</Link> and{" "}
          <Link to="/terms">Terms of Use</Link>
        </p>
      </div>
      <div className={styles.decorContainer}></div>
    </div>
  );
}
// Named alias for react-router's route-level `lazy`
export { Register as Component };
