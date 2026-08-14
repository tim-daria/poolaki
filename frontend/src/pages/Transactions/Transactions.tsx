import { useState, useRef, useEffect } from "react";
import { mockTransactions, CATEGORIES } from "../Home/mockData";
import type { Transaction, TransactionType } from "../Home/mockData";
import styles from "./Transactions.module.css";
import { UniversalModal as Modal } from "../../components/Modal/Modal";
const PAGE_SIZE = 10;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export function Transactions() {
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState<"All" | TransactionType>("All");
  const [recurring, setRecurring] = useState(false);
  const [taxRefundable, setTaxRefundable] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  const filtered = (() => {
    const result = mockTransactions.filter((t) => {
      if (
        search &&
        !t.name.toLowerCase().includes(search.toLowerCase()) &&
        !t.category.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      if (category !== "All" && t.category !== category) return false;
      if (type !== "All" && t.type !== type) return false;
      if (recurring && !t.recurring) return false;
      if (taxRefundable && !t.taxRefundable) return false;
      return true;
    });

    return result.sort((a, b) => {
      switch (sortKey) {
        case "date-desc":
          return b.date.localeCompare(a.date);
        case "date-asc":
          return a.date.localeCompare(b.date);
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
      }
    });
  })();

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setCategory("All");
    setType("All");
    setRecurring(false);
    setTaxRefundable(false);
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  const activeFilterCount = [
    fromDate,
    toDate,
    category !== "All" ? category : "",
    type !== "All" ? type : "",
    recurring ? "recurring" : "",
    taxRefundable ? "tax" : "",
  ].filter(Boolean).length;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search by name, category..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select
          className={styles.sortSelect}
          value={sortKey}
          onChange={(e) => {
            setSortKey(e.target.value as SortKey);
            setPage(1);
          }}
        >
          <option value="date-desc">Date: newest first</option>
          <option value="date-asc">Date: oldest first</option>
          <option value="amount-desc">Amount: high to low</option>
          <option value="amount-asc">Amount: low to high</option>
        </select>
        <div className={styles.filterWrapper} ref={filterRef}>
          <button
            className={styles.filterBtn}
            onClick={() => setFilterOpen((o) => !o)}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          {filterOpen && (
            <div className={styles.filterDropdown}>
              <label>
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Type
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as "All" | TransactionType);
                    setPage(1);
                  }}
                >
                  <option value="All">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </label>
              <div className={styles.toggleRow}>
                <span>Recurring</span>
                <button
                  className={`${styles.toggle} ${recurring ? styles.toggleOn : ""}`}
                  onClick={() => {
                    setRecurring((v) => !v);
                    setPage(1);
                  }}
                  aria-pressed={recurring}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRow}>
                <span>Tax Refundable</span>
                <button
                  className={`${styles.toggle} ${taxRefundable ? styles.toggleOn : ""}`}
                  onClick={() => {
                    setTaxRefundable((v) => !v);
                    setPage(1);
                  }}
                  aria-pressed={taxRefundable}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
              <button className={styles.clearBtn} onClick={clearFilters}>
                Clear
              </button>
            </div>
          )}
        </div>
        <button className={styles.addBtn} onClick={() => setAddOpen(true)}>
          + Add Transaction
        </button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Category</th>
            <th>Type</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr>
              <td colSpan={6} className={styles.empty}>
                No transactions found
              </td>
            </tr>
          ) : (
            paginated.map((t: Transaction) => (
              <tr key={t.id}>
                <td>{formatDate(t.date)}</td>
                <td>{t.name}</td>
                <td>
                  <span className={styles.categoryBadge}>{t.category}</span>
                </td>
                <td>
                  <span
                    className={
                      t.type === "income" ? styles.incomeTag : styles.expenseTag
                    }
                  >
                    {t.type === "income" ? "↗ Income" : "↘ Expense"}
                  </span>
                </td>
                <td
                  className={
                    t.type === "income" ? styles.incomeAmt : styles.expenseAmt
                  }
                >
                  {t.type === "income" ? "+" : "-"}€{t.amount.toFixed(2)}
                </td>
                <td>
                  <button className={styles.moreBtn}>···</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className={styles.footer}>
        <span>
          Showing {paginated.length} of {filtered.length} transactions
        </span>
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            ‹ Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={p === page ? styles.activePage : ""}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next ›
          </button>
        </div>
      </div>
      {addOpen && (
        <Modal mode="transaction" onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}

// Named alias for react-router's route-level `lazy`
export { Transactions as Component };
