import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../context/useAuth";
import { getCsrfToken } from "../../lib/csrf";
import { parseAllauthErrors, type AllauthError } from "../../lib/authErrors";
import { startSocialAuth } from "../../lib/socialAuth";
import type { User } from "../../context/AuthContext";
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

export function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    // Ensure the CSRF cookie is set for unauthenticated users
    void fetch("/api/csrf/", { credentials: "include" });
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
      // non-JSON responce
    }

    if (res.ok && data?.data?.user) {
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
