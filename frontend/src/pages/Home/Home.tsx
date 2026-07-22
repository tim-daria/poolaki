import styles from "./styles.module.css";
import { mockUser, mockStats, mockTransactions, mockGoals } from "./mockData";

export default function Home() {
  const { currentMonth, lastMonth } = mockStats;
  const netBalance = currentMonth.income - currentMonth.expenses;

  return (
    <div className={styles.homeContainer}>
      <div className={styles.heading}>
        <h2>Hello {mockUser.name}👋</h2>
        <p>
          Balance: <span>€{(currentMonth.income - currentMonth.expenses).toFixed(2)}</span>
        </p>
      </div>
      <div className={styles.statsHead}>
        <div className={styles.statsXS}>
          <span>Income ({currentMonth.label})</span>
          <span>€{currentMonth.income.toFixed(2)}</span>
          <span>vs €{lastMonth.income.toFixed(2)} last month</span>
        </div>
        <div className={styles.statsXS}>
          <span>Expenses ({currentMonth.label})</span>
          <span>€{currentMonth.expenses.toFixed(2)}</span>
          <span>vs €{lastMonth.expenses.toFixed(2)} last month</span>
        </div>
      </div>
      <div className={styles.statsColumn}>
        <div className={styles.statsM}>
          <h2>Net Balance</h2>
          <span>
            {netBalance >= 0 ? "+" : ""}€{netBalance.toFixed(2)}
          </span>
        </div>
        <div className={styles.statsL}>
          <h2>Recent Transactions</h2>
          {mockTransactions.map((t) => (
            <div key={t.id}>
              <span>{t.date}</span>
              <span>{t.category}</span>
              <span>{t.name}</span>
              <span>
                {t.type === "income" ? "+" : "-"}€{t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.statsColumn}>
        <div className={styles.statsL}>
          <h2>Goals</h2>
          {mockGoals.map((g) => (
            <div key={g.id}>
              <span>{g.name}</span>
              <span>
                €{g.savedAmount.toFixed(2)} / €{g.targetAmount.toFixed(2)}
              </span>
              <span>Deadline: {g.deadline}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
