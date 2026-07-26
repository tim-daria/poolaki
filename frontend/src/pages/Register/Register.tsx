import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/useAuth";
import { getCsrfToken } from "../../lib/csrf";
import { submitInitialBalance } from "../../lib/initialBalance";
import {
  startSocialAuth
} from "../../lib/socialAuth";
import styles from "./styles.module.css";

/*
	1. Register using email, username, password
	2. Register via 42OAuth
	3. If successful, ask for starting budget
	4. Create an Organisation (backend)
	5. Send user to Homepage
	6. If not successful, error message / page

	Codes:
	200 - OK
	201 - Created, but email verification needed (not required)
	400 - Validation error (weak password, not unique name/email)
	500 - Server error

 */

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balance, setBalance] = useState("");
  const [balanceError, setBalanceError] = useState("");
  const [pendingUser, setPendingUser] = useState<{
    id: number;
    username: string;
    email: string;
  } | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    // Ensure the CSRF cookie is set for unauthenticated users
    void fetch("/api/csrf/", { credentials: "include" });
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (/^\d+$/.test(password)) {
      setError("Password cannot be entirely numeric");
      return;
    }

    if (username && password.toLowerCase().includes(username.toLowerCase())) {
      setError("Password is too similar to your username");
      return;
    }

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
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setPendingUser(data.data.user);
      setShowBalanceModal(true);
    } else {
      const msg = data.errors?.[0]?.message ?? "Registration failed";
      setError(msg);
    }
  }

  async function handleBalanceSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBalanceError("");

    const result = await submitInitialBalance(balance, getCsrfToken());

    if (result.ok) {
      setUser(pendingUser);
      navigate("/");
    } else {
      setBalanceError(result.error ?? "Failed to create organisation. Please try again.");
    }
  }

  return (
    <div className={styles.helloPage}>
      <div className={styles.formContainer}>
        <p>
          Already have an account? <a href="/login">Login</a>
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
      </div>
      <div className={styles.decorContainer}></div>

      <dialog open={showBalanceModal} className={styles.modal}>
        <h2>One more step!</h2>
        <p>Enter your initial balance:</p>
        <form onSubmit={handleBalanceSubmit}>
          <label htmlFor="balance">Initial Balance (€)</label>
          <input
            id="balance"
            type="number"
            min="0"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            required
            autoFocus
          />
          {balanceError && <p className={styles.error}>{balanceError}</p>}
          <button type="submit" className={styles.submitBtn}>
            Get Started
          </button>
        </form>
      </dialog>
    </div>
  );
}
