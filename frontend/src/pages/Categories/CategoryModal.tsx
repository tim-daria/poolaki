import { useState } from "react";
import type { CategoryMeta } from "../Home/mockData";
import styles from "./CategoryModal.module.css";

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICONS: { key: string; svg: React.ReactNode }[] = [
  {
    key: "food",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 11h18M3 11V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M3 11v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" />
        <line x1="9" y1="5" x2="9" y2="11" />
        <line x1="15" y1="5" x2="15" y2="11" />
      </svg>
    ),
  },
  {
    key: "transport",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="2" y="8" width="20" height="10" rx="2" />
        <path d="M6 18v2M18 18v2M2 12h20" />
        <circle cx="7" cy="18" r="1" />
        <circle cx="17" cy="18" r="1" />
      </svg>
    ),
  },
  {
    key: "utilities",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    key: "health",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    key: "tv",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="2" y="3" width="20" height="15" rx="2" />
        <polyline points="8 21 12 17 16 21" />
      </svg>
    ),
  },
  {
    key: "shopping_bag",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    key: "home",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: "fitness",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    key: "plane",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    ),
  },
  {
    key: "coffee",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    key: "gift",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    key: "book",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: "music",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    key: "camera",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    key: "bike",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6a1 1 0 0 0-1-1h-4" />
        <path d="M15 6l3 4H9.5l-2.5-5" />
        <path d="M12 6v6l3.5-3.5" />
      </svg>
    ),
  },
  {
    key: "briefcase",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    key: "pet",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="4.5" cy="6" r="1.5" />
        <circle cx="19.5" cy="6" r="1.5" />
        <circle cx="4.5" cy="13.5" r="1.5" />
        <circle cx="19.5" cy="13.5" r="1.5" />
        <path d="M12 7c-2.8 0-5 2-5 4.5v3c0 1.5 1 2.5 3 3l2 .5 2-.5c2-0.5 3-1.5 3-3v-3c0-2.5-2.2-4.5-5-4.5z" />
      </svg>
    ),
  },
  {
    key: "gamepad",
    svg: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <circle cx="15" cy="11" r="1" />
        <circle cx="17" cy="13" r="1" />
        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59L1.99 18.59A2 2 0 0 0 3.98 21h.01a2 2 0 0 0 1.72-.99L7 18h10l1.29 2.01A2 2 0 0 0 20.01 21h.01a2 2 0 0 0 1.99-2.41L20.3 8.59A4 4 0 0 0 17.32 5z" />
      </svg>
    ),
  },
];

const COLORS = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#ea580c",
  "#06b6d4",
  "#15803d",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initial?: CategoryMeta;
  onClose: () => void;
  onSave: (meta: CategoryMeta) => void;
  onDelete?: (name: string) => void;
}

const DEFAULT_ICON = "food";
const DEFAULT_COLOR = COLORS[0];

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryModal({ initial, onClose, onSave, onDelete }: Props) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? DEFAULT_ICON);
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setError("");
    const selectedIcon = ICONS.find((i) => i.key === icon);
    onSave({
      name: name.trim(),
      icon: selectedIcon ? icon : DEFAULT_ICON,
      color,
    });
    onClose();
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete?.(initial!.name);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerIcon}>🏷️</span>
          <h2>{isEdit ? "Edit Category" : "Create New Category"}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Category Name <span className={styles.req}>*</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Groceries, Transport..."
              autoFocus
            />
            {error && <span className={styles.error}>{error}</span>}
          </label>

          <fieldset className={styles.fieldset}>
            <legend>Choose an Icon</legend>
            <div className={styles.iconGrid}>
              {ICONS.map((ic) => (
                <button
                  key={ic.key}
                  type="button"
                  className={`${styles.iconBtn} ${icon === ic.key ? styles.iconBtnActive : ""}`}
                  style={
                    icon === ic.key
                      ? { background: color, color: "#fff", borderColor: color }
                      : {}
                  }
                  onClick={() => setIcon(ic.key)}
                  aria-label={ic.key}
                >
                  {ic.svg}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Accent Color</legend>
            <div className={styles.colorRow}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorDot} ${color === c ? styles.colorDotActive : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </fieldset>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn}>
            ⊕ {isEdit ? "Save Changes" : "Create Category"}
          </button>

          {isEdit && onDelete && (
            <button
              type="button"
              className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnConfirm : ""}`}
              onClick={handleDelete}
            >
              {confirmDelete ? "⚠️ Confirm Delete" : "🗑 Delete Category"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
