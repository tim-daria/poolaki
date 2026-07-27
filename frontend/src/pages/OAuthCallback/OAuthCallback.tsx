import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../context/useAuth";
import { getCsrfToken } from "../../lib/csrf";
import { submitInitialBalance } from "../../lib/initialBalance";
import styles from "../Register/styles.module.css";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSignupFlow = searchParams.get("flow") === "signup";
  const { setUser } = useAuth();
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/_allauth/browser/v1/auth/session", {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const sessionUser = data?.data?.user ?? null;
        if (sessionUser) {
          setUser(sessionUser);
        }

        if (!isSignupFlow) {
          setChecking(false);
          navigate("/", { replace: true });
          return;
        }

        if (!sessionUser) {
          setChecking(false);
          navigate("/login", { replace: true });
          return;
        }

        fetch("/api/organizations/personal/initial-balance/", {
          credentials: "include",
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.needs_initial_balance) {
              setReady(true);
            } else {
              navigate("/", { replace: true });
            }
          })
          .catch(() => navigate("/", { replace: true }))
          .finally(() => setChecking(false));
      })
      .catch(() => {
        setChecking(false);
        navigate("/login", { replace: true });
      });
  }, [isSignupFlow, navigate, setUser]);

  async function handleBalanceSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    const result = await submitInitialBalance(balance, getCsrfToken());

    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setError(result.error ?? "Failed to create organisation. Please try again.");
    }
  }

  if (!isSignupFlow) {
    return null;
  }

  if (checking) {
    return (
      <div className={styles.helloPage}>
        <div className={styles.formContainer}>
          <h1>Checking your 42 account</h1>
          <p>Please wait...</p>
        </div>
        <div className={styles.decorContainer}></div>
      </div>
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <dialog open className={styles.modal}>
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
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn}>
            Get Started
          </button>
        </form>
    </dialog>
  );
}
