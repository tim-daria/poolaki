import { useState, useEffect, type ReactNode } from "react";
import { useAuth } from "../context/useAuth";
import { getCsrfToken } from "../lib/csrf";
import { submitInitialBalance } from "../lib/initialBalance";
// import { Button } from "./Button/Button";
import styles from "../pages/Register/styles.module.css";

interface GateProps {
  children: ReactNode;
}

export function InitialBalanceGate({ children }: GateProps) {
  const { user } = useAuth();
  const [needsBalance, setNeedsBalance] = useState(false);
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch("/api/organizations/personal/initial-balance", {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setNeedsBalance(Boolean(data?.needs_initial_balance)))
      .catch(() => {});
  }, [user]);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    const res = await submitInitialBalance(balance, getCsrfToken());
    if (res.ok) {
      setNeedsBalance(false);
    } else {
      setError(
        res.error ?? "Failed to create new workspace. Please try again.",
      );
    }
  }

  return (
    <>
      {children}
      {needsBalance && (
        <dialog open className={styles.modal}>
          <h2>One more step!</h2>
          <p>Enter your initial balance:</p>
          <form onSubmit={handleSubmit}>
            <label>
              Initial Balance (€)
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
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.submitBtn}>
              Get Started
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}
