import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../context/useAuth";
import { getCsrfToken } from "../../lib/csrf";
import { startSocialAuth } from "../../lib/socialAuth";
import styles from "../Register/styles.module.css";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    fetch("/api/csrf/", { credentials: "include" });
  }, []);

  useEffect(() => {
    if (searchParams.get("error") === "account_not_found") {
      setError("No 42 account is linked to this login. Please sign up first.");
    }
  }, [searchParams]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    const res = await fetch("/_allauth/browser/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      credentials: "include",
      body: JSON.stringify(
        identifier.includes("@")
          ? { email: identifier, password }
          : { username: identifier, password },
      ),
    });

    const data = await res.json();

    if (res.ok) {
      setUser(data.data.user);
      navigate("/");
    } else {
      const msg = data.errors?.[0]?.message ?? "Login failed";
      setError(msg);
    }
  }

  return (
    <div className={styles.helloPage}>
      <div className={styles.formContainer}>
        <p>
          Not registered yet? <a href="/register">Sign up</a>
        </p>
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="identifier">Username or Email</label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn}>
            Login
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
              "/oauth-callback?flow=login",
              getCsrfToken(),
            )
          }
        >
          Login with 42
        </button>
      </div>
      <div className={styles.decorContainer}></div>
    </div>
  );
}
