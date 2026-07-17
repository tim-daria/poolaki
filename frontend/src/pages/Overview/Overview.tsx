import { useState } from "react";
import "./overview.css";

// ─── Icons (inline SVG, no dependency needed) ─────────────────
const Icon = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/>
    </svg>
  ),
  Transactions: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"/>
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>
    </svg>
  ),
  Chart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  ),
  Repeat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  TrendUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  TrendDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
    </svg>
  ),
  Cart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
  Cash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
    </svg>
  ),
  Tv: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  Car: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l3-4h8l3 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
    </svg>
  ),
  Fork: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  ),
  CollapseLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>
    </svg>
  ),
  CollapseRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>
    </svg>
  ),
};

// ─── Data ─────────────────────────────────────────────────────
type Period = "1" | "3" | "6" | "12";

const periodData: Record<Period, { income: string; expense: string; incomeComp: string; expComp: string }> = {
  "1":  { income: "€3,840", expense: "€2,190", incomeComp: "vs €3,200 last month",   expComp: "vs €2,440 last month" },
  "3":  { income: "€11,200", expense: "€6,850", incomeComp: "avg €3,733 / month",     expComp: "avg €2,283 / month" },
  "6":  { income: "€22,800", expense: "€13,100", incomeComp: "avg €3,800 / month",    expComp: "avg €2,183 / month" },
  "12": { income: "€45,600", expense: "€26,400", incomeComp: "avg €3,800 / month",    expComp: "avg €2,200 / month" },
};

const transactions = [
  { id: 1, name: "Lidl",         category: "Groceries", space: "Shared",  type: "expense", amount: "−€64.20",  date: "Today",  Icon: Icon.Cart,  recurring: false },
  { id: 2, name: "July salary",  category: "Income",    space: "Private", type: "income",  amount: "+€3,200", date: "1 Jul",  Icon: Icon.Cash,  recurring: false },
  { id: 3, name: "Netflix",      category: "Entertainment", space: "Shared", type: "expense", amount: "−€15.99", date: "1 Jul", Icon: Icon.Tv, recurring: true },
];

const categories = [
  { name: "Groceries", Icon: Icon.Cart,  spent: 380, budget: 500,  color: "#2D7D52", bg: "#EBF5EF" },
  { name: "Transport", Icon: Icon.Car,   spent: 210, budget: 250,  color: "#B86E1A", bg: "#FDF3E7" },
  { name: "Dining",    Icon: Icon.Fork,  spent: 95,  budget: 200,  color: "#5B47C2", bg: "#EFEDFA" },
];

const goals = [
  { name: "Emergency fund", pct: 62, saved: "€3,100 saved",  target: "target €5,000 · ends Aug 2026" },
  { name: "Holiday 2026",   pct: 38, saved: "€760 saved",    target: "target €2,000 · ends Dec 2026" },
  { name: "New laptop",     pct: 81, saved: "€1,215 saved",  target: "target €1,500 · ends Sep 2026" },
];

const spaces = [
  { id: "family",   name: "Family space",    color: "#2D7D52", dot: "#3D9E68" },
  { id: "personal", name: "Personal",         color: "#5B47C2", dot: "#7060D4" },
  { id: "work",     name: "Work (freelance)", color: "#B86E1A", dot: "#D4831F" },
];

const navItems = [
  { label: "Overview",     Icon: Icon.Home,         active: true  },
  { label: "Transactions", Icon: Icon.Transactions, active: false },
  { label: "Goals",        Icon: Icon.Target,       active: false },
  { label: "Reports",      Icon: Icon.Chart,        active: false },
];
const navBottom = [
  { label: "Recurring", Icon: Icon.Repeat },
  { label: "Settings",  Icon: Icon.Settings },
];

// ─── Component ────────────────────────────────────────────────
export default function Overview() {
  const [collapsed, setCollapsed]     = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [activeSpace, setActiveSpace] = useState("family");
  const [period, setPeriod]           = useState<Period>("1");
  const [goalIdx, setGoalIdx]         = useState(0);
  const [activeNav, setActiveNav]     = useState("Overview");

  const stats = periodData[period];
  const currentSpace = spaces.find(s => s.id === activeSpace)!;
  const goal = goals[goalIdx];

  function cycleGoal(dir: 1 | -1) {
    setGoalIdx((goalIdx + dir + goals.length) % goals.length);
  }

  return (
    <div className="app" onClick={() => menuOpen && setMenuOpen(false)}>

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sb-header">
          <div className="logo">
            <div className="logo-mark">F</div>
            <span className="logo-name">Flowr</span>
          </div>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <Icon.CollapseRight /> : <Icon.CollapseLeft />}
          </button>
        </div>

        <nav className="sb-nav">
          {navItems.map(item => (
            <button
              key={item.label}
              className={`nav-item ${activeNav === item.label ? "active" : ""}`}
              onClick={() => setActiveNav(item.label)}
              aria-current={activeNav === item.label ? "page" : undefined}
            >
              <item.Icon />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}

          <div className="nav-divider" />

          {navBottom.map(item => (
            <button
              key={item.label}
              className={`nav-item ${activeNav === item.label ? "active" : ""}`}
              onClick={() => setActiveNav(item.label)}
            >
              <item.Icon />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sb-footer">
          {/* Space switcher popover */}
          <div
            className={`space-menu ${menuOpen ? "open" : ""}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="space-menu-label">Switch space</div>
            {spaces.map(space => (
              <div
                key={space.id}
                className={`space-menu-item ${activeSpace === space.id ? "current" : ""}`}
                onClick={() => { setActiveSpace(space.id); setMenuOpen(false); }}
              >
                <span className="space-dot" style={{ background: space.dot }} />
                {space.name}
                {activeSpace === space.id && (
                  <span className="space-check"><Icon.Check /></span>
                )}
              </div>
            ))}
            <div className="space-menu-sep" />
            <div className="space-menu-item">Account settings</div>
            <div className="space-menu-item">Sign out</div>
          </div>

          <button
            className="avatar-btn"
            onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
            aria-expanded={menuOpen}
            aria-label="Switch space or open account menu"
          >
            <div className="avatar">AK</div>
            <div className="avatar-info">
              <div className="avatar-name">Anna K.</div>
              <div className="avatar-space">{currentSpace.name}</div>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">

        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-title">
            <h1>Overview</h1>
            <p>Monday, 14 July 2026 · {currentSpace.name}</p>
          </div>
          <div className="topbar-right">
            <span className="period-label">Period</span>
            <select
              className="period-select"
              value={period}
              onChange={e => setPeriod(e.target.value as Period)}
              aria-label="Select period"
            >
              <option value="1">This month</option>
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
            </select>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="content">

          {/* Stat cards */}
          <div className="stat-row">
            <div className="stat-card income" role="button" tabIndex={0} aria-label="View income details">
              <div className="stat-label">
                <Icon.TrendUp /> Total income
              </div>
              <div className="stat-value">{stats.income}</div>
              <div className="stat-comparison">{stats.incomeComp}</div>
            </div>
            <div className="stat-card expense" role="button" tabIndex={0} aria-label="View expense details">
              <div className="stat-label">
                <Icon.TrendDown /> Total expenses
              </div>
              <div className="stat-value">{stats.expense}</div>
              <div className="stat-comparison">{stats.expComp}</div>
            </div>
          </div>

          {/* Recent transactions */}
          <section className="section" aria-label="Recent transactions">
            <div className="section-header">
              <span className="section-title">Recent transactions</span>
              <div className="section-actions">
                <button className="see-all">See all</button>
                <button className="add-btn" onClick={e => e.stopPropagation()} aria-label="Add transaction">
                  <Icon.Plus /> Add
                </button>
              </div>
            </div>
            <div className="tx-list">
              {transactions.map(tx => (
                <div key={tx.id} className="tx-item" role="button" tabIndex={0} aria-label={`${tx.name}, ${tx.amount}`}>
                  <div className={`tx-icon ${tx.type}`}>
                    <tx.Icon />
                  </div>
                  <div className="tx-meta">
                    <div className="tx-name">{tx.name}</div>
                    <div className="tx-sub">
                      {tx.category} · {tx.space}
                      {tx.recurring && <span className="badge recurring" style={{ marginLeft: 6 }}>Recurring</span>}
                    </div>
                  </div>
                  <div className="tx-right">
                    <div className={`tx-amount ${tx.type === "expense" ? "negative" : "positive"}`}>
                      {tx.amount}
                    </div>
                    <div className="tx-date">{tx.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Most spendable categories */}
          <section className="section" aria-label="Most spendable categories">
            <div className="section-header">
              <span className="section-title">Most spendable categories</span>
              <button className="see-all">See all</button>
            </div>
            <div className="cat-list">
              {categories.map(cat => {
                const pct = Math.round((cat.spent / cat.budget) * 100);
                return (
                  <div key={cat.name} className="cat-item" role="button" tabIndex={0} aria-label={`${cat.name}: €${cat.spent} of €${cat.budget}`}>
                    <div className="cat-row">
                      <div className="cat-name">
                        <span className="cat-icon" style={{ background: cat.bg, color: cat.color }}>
                          <cat.Icon />
                        </span>
                        {cat.name}
                      </div>
                      <div className="cat-spent">
                        €{cat.spent} <span>/ €{cat.budget}</span>
                      </div>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${pct}%`, background: cat.color }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Goals */}
          <section className="section" aria-label="Goals">
            <div className="section-header">
              <div className="section-actions" style={{ gap: 10 }}>
                <span className="section-title">Goals</span>
                <div className="goal-nav-dots" aria-label="Goal navigation">
                  {goals.map((_, i) => (
                    <button
                      key={i}
                      className={`goal-dot ${i === goalIdx ? "active" : ""}`}
                      onClick={e => { e.stopPropagation(); setGoalIdx(i); }}
                      aria-label={`Go to goal ${i + 1}`}
                      aria-current={i === goalIdx}
                    />
                  ))}
                </div>
              </div>
              <div className="section-actions">
                <button className="see-all" onClick={e => e.stopPropagation()}>See all</button>
                <button
                  className="goal-cycle-btn"
                  onClick={e => { e.stopPropagation(); cycleGoal(1); }}
                  aria-label="Next goal"
                >
                  <Icon.ChevronRight />
                </button>
                <button className="add-btn" onClick={e => e.stopPropagation()} aria-label="Add goal">
                  <Icon.Plus /> Add
                </button>
              </div>
            </div>
            <div className="goal-body" role="button" tabIndex={0} aria-label={`${goal.name}, ${goal.pct}% complete`}>
              <div className="goal-title-row">
                <div className="goal-name">{goal.name}</div>
                <div className="goal-pct">{goal.pct}%</div>
              </div>
              <div className="goal-bar-track">
                <div
                  className="goal-bar-fill"
                  style={{ width: `${goal.pct}%` }}
                  role="progressbar"
                  aria-valuenow={goal.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="goal-meta">
                <span>{goal.saved}</span>
                <span>{goal.target}</span>
              </div>
            </div>
          </section>

        </div>{/* end .content */}

        {/* AI strip */}
        <div className="ai-strip-wrap">
          <button className="ai-strip" aria-label="Open AI assistant">
            <div className="ai-orb"><Icon.Sparkles /></div>
            <span className="ai-placeholder">Ask anything about your finances…</span>
            <span className="ai-shortcut">⌘K</span>
          </button>
        </div>

      </main>
    </div>
  );
}
