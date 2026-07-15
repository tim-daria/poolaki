import styles from "./styles.module.css";

export default function Home() {
  return (
    <div className={styles.homeContainer}>
      <div className={styles.statsHead}>
        <div className={styles.statsXS}>
          <span>Total income</span>
          <span>€{}</span>
          <span>vs €{} last month</span>
        </div>
        <div className={styles.statsXS}>
          <span>Total expenses</span>
          <span>€{}</span>
          <span>vs €{} last month</span>
        </div>
      </div>
      <div className={styles.statsColumn}>
        <div className={styles.statsL}>
          <h2>
            Recent Transactions <button>Add</button>
          </h2>
          <div>Transactions container</div>
        </div>
        <div className={styles.statsM}>
          <h2>
            Goals <button>Add</button>
          </h2>
          <div>Goal container</div>
        </div>
      </div>
      <div className={styles.statsColumn}>
        <div className={styles.statsM}>
          <h2>Net Balance</h2>
          <span>+ €1.650</span>
          <h3>Savings rate</h3>
          <span>43% of income</span>
          <span>vs last month ↑ €310</span>
        </div>
        <div className={styles.statsL}>
          <h2>
            Top Categories <button>Add</button>
          </h2>
          <div>Categories container</div>
        </div>
      </div>
    </div>
  );
}
