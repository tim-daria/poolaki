import { useState, useRef, useEffect } from "react";
import { CATEGORY_META, mockTransactions } from "../Home/mockData";
import type { CategoryMeta } from "../Home/mockData";
import { CategoryModal } from "./CategoryModal";
import styles from "./Categories.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PeriodOption {
  label: string;
  from: string;
  to: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}
function isoMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}

const PERIODS: PeriodOption[] = [
  { label: "Today", from: today(), to: today() },
  {
    label: "This week",
    from: (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().slice(0, 10);
    })(),
    to: today(),
  },
  { label: "This month", from: `${isoMonth()}-01`, to: today() },
  { label: "Last month", from: `${isoMonth(-1)}-01`, to: `${isoMonth(-1)}-31` },
  { label: "Last 3 months", from: `${isoMonth(-3)}-01`, to: today() },
  {
    label: "This year",
    from: `${new Date().getFullYear()}-01-01`,
    to: today(),
  },
];

// ─── SVG Pie Chart ────────────────────────────────────────────────────────────

function PieChart({ slices }: { slices: { color: string; value: number }[] }) {
  const SIZE = 220;
  const R = 80;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return <div className={styles.pieEmpty}>No data</div>;

  let angle = -Math.PI / 2;
  const paths: { d: string; color: string }[] = [];

  for (const sl of slices) {
    if (sl.value === 0) continue;
    const sweep = (sl.value / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    const x2 = CX + R * Math.cos(angle + sweep);
    const y2 = CY + R * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push({
      color: sl.color,
      d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`,
    });
    angle += sweep;
  }

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={styles.pie}
    >
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth={2} />
      ))}
      {/* donut hole */}
      <circle cx={CX} cy={CY} r={R * 0.52} fill="var(--bg-card, #fff)" />
    </svg>
  );
}

// ─── Category card in "Your Categories" ──────────────────────────────────────

function CategoryCard({
  meta,
  onEdit,
}: {
  meta: CategoryMeta;
  onEdit: () => void;
}) {
  return (
    <div className={styles.catCard}>
      <span
        className={styles.catIcon}
        style={{ background: `${meta.color}22` }}
      >
        {meta.icon}
      </span>
      <span className={styles.catName}>{meta.name}</span>
      <button
        className={styles.catEdit}
        onClick={onEdit}
        aria-label={`Edit ${meta.name}`}
      >
        ✏️
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 8;

export function Categories() {
  const [categories, setCategories] = useState<CategoryMeta[]>(CATEGORY_META);
  const [showAll, setShowAll] = useState(false);
  const [modalTarget, setModalTarget] = useState<CategoryMeta | null | "new">(
    null,
  );
  const [statType, setStatType] = useState<"expense" | "income">("expense");
  const [periodIdx, setPeriodIdx] = useState(2); // "This month" default
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node))
        setPeriodOpen(false);
    }
    if (periodOpen) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [periodOpen]);

  const visible = showAll ? categories : categories.slice(0, MAX_VISIBLE);

  function handleSave(meta: CategoryMeta) {
    setCategories((prev) =>
      modalTarget === "new"
        ? [...prev, meta]
        : prev.map((c) =>
            c.name === (modalTarget as CategoryMeta).name ? meta : c,
          ),
    );
  }

  function handleDelete(name: string) {
    setCategories((prev) => prev.filter((c) => c.name !== name));
  }
  const period = PERIODS[periodIdx];

  // Aggregate transactions for selected period + type
  const filtered = mockTransactions.filter(
    (t) => t.type === statType && t.date >= period.from && t.date <= period.to,
  );

  const byCategory = CATEGORY_META.map((meta) => {
    const sum = filtered
      .filter((t) => t.category === meta.name)
      .reduce((s, t) => s + t.amount, 0);
    return { ...meta, sum };
  })
    .filter((c) => c.sum > 0)
    .sort((a, b) => b.sum - a.sum);

  const total = byCategory.reduce((s, c) => s + c.sum, 0);

  return (
    <div className={styles.page}>
      {/* ── Your Categories ── */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Your Categories</span>
        <span className={styles.sectionCount}>
          {categories.length} categories
        </span>
        <button className={styles.addBtn} onClick={() => setModalTarget("new")}>
          + New Category
        </button>
      </div>
      <div className={styles.catGrid}>
        {visible.map((meta) => (
          <CategoryCard
            key={meta.name}
            meta={meta}
            onEdit={() => setModalTarget(meta)}
          />
        ))}
      </div>
      {categories.length > MAX_VISIBLE && (
        <button
          className={styles.showMoreBtn}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll
            ? "Show less ▴"
            : `Show ${CATEGORY_META.length - MAX_VISIBLE} more ▾`}
        </button>
      )}

      {/* ── Statistics ── */}
      <div className={styles.sectionHeader} style={{ marginTop: "1rem" }}>
        <span className={styles.sectionTitle}>Statistics</span>
        <div className={styles.togglePill}>
          <button
            className={statType === "expense" ? styles.pillActive : ""}
            onClick={() => setStatType("expense")}
          >
            Expenses
          </button>
          <button
            className={statType === "income" ? styles.pillActive : ""}
            onClick={() => setStatType("income")}
          >
            Income
          </button>
        </div>
        <div className={styles.periodWrapper} ref={periodRef}>
          <button
            className={styles.periodBtn}
            onClick={() => setPeriodOpen((o) => !o)}
          >
            {PERIODS[periodIdx].label} ▾
          </button>
          {periodOpen && (
            <div className={styles.periodDropdown}>
              {PERIODS.map((p, i) => (
                <button
                  key={p.label}
                  className={i === periodIdx ? styles.periodActive : ""}
                  onClick={() => {
                    setPeriodIdx(i);
                    setPeriodOpen(false);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.statsPanel}>
        <div className={styles.chartCol}>
          <PieChart
            slices={byCategory.map((c) => ({ color: c.color, value: c.sum }))}
          />
          {total > 0 && (
            <p className={styles.chartTotal}>
              Total: <strong>€{total.toFixed(2)}</strong>
            </p>
          )}
        </div>
        <div className={styles.legendCol}>
          {byCategory.length === 0 ? (
            <p className={styles.noData}>No {statType} data for this period.</p>
          ) : (
            byCategory.map((c) => (
              <div key={c.name} className={styles.legendCard}>
                <span
                  className={styles.legendDot}
                  style={{ background: c.color }}
                />
                <span className={styles.legendIcon}>{c.icon}</span>
                <span className={styles.legendName}>{c.name}</span>
                <span className={styles.legendPct}>
                  {((c.sum / total) * 100).toFixed(1)}%
                </span>
                <span className={styles.legendAmt}>€{c.sum.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {modalTarget !== null && (
        <CategoryModal
          initial={modalTarget === "new" ? undefined : modalTarget}
          onClose={() => setModalTarget(null)}
          onSave={handleSave}
          onDelete={modalTarget !== "new" ? handleDelete : undefined}
        />
      )}
    </div>
  );
}

// Named alias for react-router's route-level `lazy`
export { Categories as Component };
