import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/useAuth";
import { getCsrfToken } from "../../lib/csrf";
import { parseAllauthErrors } from "../../lib/authErrors";
import styles from "../Register/styles.module.css";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    fetch("/api/csrf/", { credentials: "include" });
  }, []);

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
    console.log("login response:", JSON.stringify(data));

    if (res.ok) {
      setUser(data.data.user);
      navigate("/");
    } else {
      const msg = parseAllauthErrors(data.errors, "Login failed. Please check your credentials.");
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
          onClick={() => {
            // TODO: enable when 42 OAuth app is configured
          }}
        >
          Login with 42
        </button>
      </div>
      <div className={styles.decorContainer}></div>
    </div>
  );
}
