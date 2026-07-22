import { useState, useRef, useEffect } from "react";
import { mockGoals } from "../Home/mockData";
import type { Goal } from "../Home/mockData";
import Modal from "../../components/Modal/Modal";
import styles from "./Goals.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= 80 ? "#27ae60" : clamped >= 40 ? "#6c63ff" : "#f39c12";
  return (
    <div className={styles.progressTrack}>
      <div className={styles.progressFill} style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onContribute: (g: Goal) => void;
  onEdit: (g: Goal) => void;
  onDelete: (g: Goal) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pct = (goal.savedAmount / goal.targetAmount) * 100;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardName}>{goal.name}</p>
          <p className={styles.cardMeta}>{goal.category} · By {formatDate(goal.deadline)}</p>
        </div>
        <div className={styles.cardRight}>
          <span className={styles.cardSaved}>€{goal.savedAmount.toLocaleString()}</span>
          <div className={styles.menuWrapper} ref={menuRef}>
            <button
              className={styles.menuTrigger}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Goal options"
            >
              ···
            </button>
            {menuOpen && (
              <div className={styles.menu}>
                <button onClick={() => { setMenuOpen(false); onContribute(goal); }}>Contribute</button>
                <button onClick={() => { setMenuOpen(false); onEdit(goal); }}>Edit</button>
                <button className={styles.menuDelete} onClick={() => { setMenuOpen(false); onDelete(goal); }}>Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <ProgressBar pct={pct} />
      <p className={styles.cardPct}>{pct.toFixed(0)}% saved of €{goal.targetAmount.toLocaleString()}</p>
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [modalMode, setModalMode] = useState<"goal" | "transaction" | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const allContribs = goals.flatMap((g) => g.contributions);
  const avgMonthly = allContribs.length > 0
    ? allContribs.reduce((s, c) => s + c.amount, 0) / 6
    : 0;

  const closest = [...goals].sort(
    (a, b) => b.savedAmount / b.targetAmount - a.savedAmount / a.targetAmount
  )[0];

  function handleContribute(goal: Goal) {
    setSelectedGoal(goal);
    setModalMode("transaction");
  }

  function handleEdit(goal: Goal) {
    setSelectedGoal(goal);
    setModalMode("goal");
  }

  function handleDelete(goal: Goal) {
    if (window.confirm(`Delete "${goal.name}"?`)) {
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.sectionLabel}>YOUR GOALS</div>
      <div className={styles.cardGrid}>
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onContribute={handleContribute}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        <button className={styles.addCard} onClick={() => { setSelectedGoal(null); setModalMode("goal"); }}>
          <span>+</span>
          <span>New Goal</span>
        </button>
      </div>

      <div className={styles.sectionLabel}>SAVINGS OVERVIEW</div>
      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard}>
          <p className={styles.overviewLabel}>Total Saved Across All Goals</p>
          <p className={styles.overviewValue}>€{totalSaved.toLocaleString()}</p>
          <p className={styles.overviewSub}>of €{totalTarget.toLocaleString()} total target</p>
          <ProgressBar pct={totalPct} />
          <p className={styles.overviewSub}>{totalPct.toFixed(0)}% of all goals funded</p>
        </div>
        <div className={styles.overviewCard}>
          <p className={styles.overviewLabel}>Average Monthly Saving</p>
          <p className={styles.overviewValue}>€{avgMonthly.toFixed(0)}</p>
          <p className={styles.overviewSub}>Based on last 6 months</p>
        </div>
        <div className={styles.overviewCard}>
          <p className={styles.overviewLabel}>Closest to Complete</p>
          {closest && (
            <>
              <p className={styles.overviewValue}>{closest.name}</p>
              <p className={styles.overviewSub}>
                €{closest.savedAmount.toLocaleString()} saved of €{closest.targetAmount.toLocaleString()}
              </p>
              <ProgressBar pct={(closest.savedAmount / closest.targetAmount) * 100} />
              <p className={styles.overviewSub}>
                {((closest.savedAmount / closest.targetAmount) * 100).toFixed(0)}%
              </p>
            </>
          )}
        </div>
      </div>

      {modalMode && (
        <Modal
          mode={modalMode}
          onClose={() => { setModalMode(null); setSelectedGoal(null); }}
        />
      )}
    </div>
  );
}
