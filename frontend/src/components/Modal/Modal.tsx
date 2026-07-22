import { useState } from "react";
import { CATEGORIES } from "../../pages/Home/mockData";
import type { TransactionType } from "../../pages/Home/mockData";
import styles from "./Modal.module.css";

export type ModalMode = "transaction" | "goal";

interface Props {
  mode: ModalMode;
  onClose: () => void;
}

const TODAY = new Date().toISOString().slice(0, 10);

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.toggleRow}>
      <span>{label}</span>
      <button
        type="button"
        className={`${styles.toggle} ${value ? styles.toggleOn : ""}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}

export default function UniversalModal({ mode, onClose }: Props) {
  const [error, setError] = useState("");

  // --- Transaction fields ---
  const [txName, setTxName] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState(CATEGORIES[0]);
  const [txDate, setTxDate] = useState(TODAY);
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [txComment, setTxComment] = useState("");
  const [txRecurring, setTxRecurring] = useState(false);
  const [txTaxRefundable, setTxTaxRefundable] = useState(false);

  // --- Goal fields ---
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalCategory, setGoalCategory] = useState(CATEGORIES[0]);
  const [goalComment, setGoalComment] = useState("");

  // --- Contribute sub-form ---
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contribAmount, setContribAmount] = useState("");
  const [contribDate, setContribDate] = useState(TODAY);
  const [contribComment, setContribComment] = useState("");

  function handleTransactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!txName.trim()) {
      setError("Name is required.");
      return;
    }
    if (!txAmount || isNaN(parseFloat(txAmount)) || parseFloat(txAmount) <= 0) {
      setError("Enter a valid positive amount.");
      return;
    }
    setError("");
    // TODO: submit to API
    console.log({
      name: txName,
      amount: parseFloat(txAmount),
      category: txCategory,
      date: txDate || TODAY,
      type: txType,
      comment: txComment,
      recurring: txRecurring,
      taxRefundable: txTaxRefundable,
    });
    onClose();
  }

  function handleGoalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goalName.trim()) {
      setError("Name is required.");
      return;
    }
    if (
      !goalAmount ||
      isNaN(parseFloat(goalAmount)) ||
      parseFloat(goalAmount) <= 0
    ) {
      setError("Enter a valid target amount.");
      return;
    }
    if (contributeOpen && contribAmount && parseFloat(contribAmount) <= 0) {
      setError("Contribution amount must be positive.");
      return;
    }
    setError("");
    // TODO: submit to API
    const payload: Record<string, unknown> = {
      name: goalName,
      targetAmount: parseFloat(goalAmount),
      deadline: goalDeadline || TODAY,
      category: goalCategory,
      comment: goalComment,
    };
    if (contributeOpen && contribAmount) {
      payload.contribution = {
        name: `Contribution to ${goalName}`,
        amount: parseFloat(contribAmount),
        category: goalCategory,
        date: contribDate || TODAY,
        type: "expense",
        comment: contribComment,
      };
    }
    console.log(payload);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{mode === "transaction" ? "Add Transaction" : "Add Goal"}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {mode === "transaction" ? (
          <form onSubmit={handleTransactionSubmit} className={styles.form}>
            <label>
              Name <span className={styles.required}>*</span>
              <input
                type="text"
                value={txName}
                onChange={(e) => setTxName(e.target.value)}
                placeholder="e.g. Grocery run"
                autoFocus
              />
            </label>
            <div className={styles.row}>
              <label>
                Amount (€) <span className={styles.required}>*</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                Date <span className={styles.required}>*</span>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                />
              </label>
            </div>
            <div className={styles.row}>
              <label>
                Category <span className={styles.required}>*</span>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Type <span className={styles.required}>*</span>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as TransactionType)}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
            </div>
            <label>
              Comment
              <textarea
                value={txComment}
                onChange={(e) => setTxComment(e.target.value)}
                placeholder="Optional note..."
                rows={2}
              />
            </label>
            <div className={styles.toggles}>
              <Toggle
                label="Recurring"
                value={txRecurring}
                onChange={setTxRecurring}
              />
              {txType === "expense" && (
                <Toggle
                  label="Tax Refundable"
                  value={txTaxRefundable}
                  onChange={setTxTaxRefundable}
                />
              )}
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn}>
                Add Transaction
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleGoalSubmit} className={styles.form}>
            <label>
              Name <span className={styles.required}>*</span>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. Japan Trip"
                autoFocus
              />
            </label>
            <div className={styles.row}>
              <label>
                Target Amount (€) <span className={styles.required}>*</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label>
                Deadline <span className={styles.required}>*</span>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                />
              </label>
            </div>
            <label>
              Category <span className={styles.required}>*</span>
              <select
                value={goalCategory}
                onChange={(e) => setGoalCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Comment
              <textarea
                value={goalComment}
                onChange={(e) => setGoalComment(e.target.value)}
                placeholder="Optional note..."
                rows={2}
              />
            </label>

            <div className={styles.contributeSection}>
              <button
                type="button"
                className={styles.contributeToggle}
                onClick={() => setContributeOpen((o) => !o)}
              >
                {contributeOpen ? "▾" : "▸"} Contribute now
              </button>
              {contributeOpen && (
                <div className={styles.contributeForm}>
                  <p className={styles.contribNote}>
                    A transaction will be created:{" "}
                    <strong>Contribution to {goalName || "…"}</strong>, category{" "}
                    <strong>{goalCategory}</strong>.
                  </p>
                  <div className={styles.row}>
                    <label>
                      Amount (€)
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={contribAmount}
                        onChange={(e) => setContribAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <label>
                      Date
                      <input
                        type="date"
                        value={contribDate}
                        onChange={(e) => setContribDate(e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Comment
                    <input
                      type="text"
                      value={contribComment}
                      onChange={(e) => setContribComment(e.target.value)}
                      placeholder="Optional note..."
                    />
                  </label>
                </div>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn}>
                Add Goal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
