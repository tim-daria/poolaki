/**
 * @file A goal's info view: its headline figures and subtitle, its
 * transactions as added / spent / withdrawn entries with each expense split
 * between the goal and the balance, and the month grouping. Pure, except the
 * loader at the end.
 */

import { monthHeading, monthYear, TODAY } from "./date";
import { goalFlags, targetReached, type Goal } from "./goals";
import { splitExpense } from "./goalSpend";
import { DEFAULT_FILTERS } from "./transactionFilters";
import { toMoneyString } from "./money";
import { fetchTransactionPage, type Transaction } from "./transactions";

/* ---------------------------------- */
/*              Headline              */
/* ---------------------------------- */

/** Two-decimal arithmetic: amounts are cents, and float sums drift. */
const cents = (n: number) => Number(toMoneyString(n));

export type GoalFigures = {
  saved: number;
  /** Expenses paid from the goal, per the row split. */
  spent: number;
  /** Unclamped percentage of the target saved. */
  pct: number;
  /** Still to save; zero once reached. */
  toGo: number;
  /** Share of the savings still in the goal, 0–100; zero once overdrawn. */
  leftShare: number;
};

/**
 * The figures the info view shows. `saved` and `spent` come from the rows,
 * since the wire only carries the net `balance`; progress to the target is
 * the server's view, so it matches the card.
 */
export function goalFigures(g: Goal, rows: SplitEntry[]): GoalFigures {
  let saved = 0;
  let spent = 0;
  for (const r of rows) {
    if (r.kind === "added") saved = cents(saved + r.amount);
    else if (r.kind === "withdrawn") saved = cents(saved - r.amount);
    else spent = cents(spent + r.fromGoal);
  }
  return {
    saved,
    spent,
    pct:
      g.target_amount === 0
        ? 0
        : Math.round((g.balance / g.target_amount) * 100),
    toGo: Math.max(0, cents(g.target_amount - g.balance)),
    leftShare:
      saved > 0 ? Math.round((Math.max(0, g.balance) / saved) * 100) : 0,
  };
}

export type GoalSubtitle = {
  /** "Goal", "Ready to spend", "Used up", "Off limits", "Archived", with a note after " · ". */
  text: string;
  /** A red tail after the text, when the goal is overdue. */
  alert: string | null;
};

/** Below zero in either open state: the balance paid the difference. */
const OFF_LIMITS: GoalSubtitle = {
  text: "Off limits · paid from your balance",
  alert: null,
};

/** One line under the goal's name: its status and the one thing to know about it. */
export function goalSubtitle(g: Goal, today: string = TODAY): GoalSubtitle {
  switch (g.status) {
    case "archived":
      return { text: "Archived", alert: null };
    case "completed":
      if (g.balance < 0) return OFF_LIMITS;
      return {
        text: g.balance === 0 ? "Used up" : "Ready to spend",
        alert: null,
      };
    case "active":
      if (g.balance < 0) return OFF_LIMITS;
      if (goalFlags(g, today).includes("overdue") && g.target_date)
        return {
          text: "Goal",
          alert: `overdue since ${monthYear(g.target_date)}`,
        };
      if (targetReached(g))
        return { text: "Goal · target reached", alert: null };
      return {
        text: g.target_date
          ? `Goal · by ${monthYear(g.target_date)}`
          : "Goal",
        alert: null,
      };
  }
}

/* ---------------------------------- */
/*              Entries               */
/* ---------------------------------- */

/** Its own union rather than EntryType: the activity never shows income. */
export type ActivityKind = "added" | "spent" | "withdrawn";

export type ActivityEntry = {
  id: number;
  kind: ActivityKind;
  /** "YYYY-MM-DD" */
  date: string;
  description: string;
  amount: number;
};

/** A transaction as goal activity. Income is never goal activity: null. */
export function toActivity(t: Transaction): ActivityEntry | null {
  const kind: ActivityKind | null =
    t.entry_type === "contribution"
      ? "added"
      : t.entry_type === "withdraw"
        ? "withdrawn"
        : t.entry_type === "expense"
          ? "spent"
          : null;
  if (kind === null) return null;
  return {
    id: t.id,
    kind,
    date: t.transaction_date,
    description: t.description,
    amount: t.amount,
  };
}

export type SplitEntry = ActivityEntry & {
  /** Both zero on added and withdrawn rows; they sum to `amount` on a spent row. */
  fromGoal: number;
  fromBalance: number;
  /** The contribution that first brought the net saved amount to the target. */
  reachedTarget: boolean;
};

/** Chronological: ties on a day keep insertion order by id. */
function chronological(a: ActivityEntry, b: ActivityEntry): number {
  return a.date.localeCompare(b.date) || a.id - b.id;
}

/**
 * Walks the entries in date order, keeping what the goal held at each step,
 * so every expense is split the way the form previewed it (splitExpense):
 * from the goal while it has money, from the balance once it runs out.
 * Returns the entries chronologically.
 */
export function annotate(
  entries: ActivityEntry[],
  target: number,
): SplitEntry[] {
  let held = 0;
  let net = 0;
  let reached = false;
  return [...entries].sort(chronological).map((e) => {
    switch (e.kind) {
      case "added": {
        held = cents(held + e.amount);
        net = cents(net + e.amount);
        const crossed = !reached && net >= target;
        if (crossed) reached = true;
        return { ...e, fromGoal: 0, fromBalance: 0, reachedTarget: crossed };
      }
      case "withdrawn":
        held = cents(held - e.amount);
        net = cents(net - e.amount);
        return { ...e, fromGoal: 0, fromBalance: 0, reachedTarget: false };
      case "spent": {
        const split = splitExpense(e.amount, held);
        held = split.leftAfter;
        return {
          ...e,
          fromGoal: split.fromGoal,
          fromBalance: split.fromBalance,
          reachedTarget: false,
        };
      }
    }
  });
}

export type MonthGroup = {
  /** "YYYY-MM" */
  key: string;
  /** "July", or "July 2025" outside the current year. */
  label: string;
  /** Newest first. */
  rows: SplitEntry[];
};

/** Newest month first, newest row first within a month. */
export function groupByMonth(rows: SplitEntry[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const row of [...rows].sort(chronological).reverse()) {
    const key = row.date.slice(0, 7);
    let group = groups.get(key);
    if (!group) {
      group = { key, label: monthHeading(`${key}-01`), rows: [] };
      groups.set(key, group);
    }
    group.rows.push(row);
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/* ---------------------------------- */
/*               Loading              */
/* ---------------------------------- */

/** Every transaction of the goal, all pages; failures and aborts propagate. */
export async function getGoalActivity(
  org_id: number,
  goalId: number,
  signal?: AbortSignal,
): Promise<ActivityEntry[]> {
  const rows: Transaction[] = [];
  let page = 1;
  let pageCount: number;
  do {
    const data = await fetchTransactionPage(
      org_id,
      { ...DEFAULT_FILTERS, goal: goalId, page },
      signal,
    );
    rows.push(...data.rows);
    pageCount = data.page_count;
    page += 1;
  } while (page <= pageCount);
  return rows.map(toActivity).filter((e) => e !== null);
}

/**
 * What an archived goal held when it was archived. Archived goals accept no
 * rows, so the newest row is the archive's own: a withdrawal returned that
 * much to the balance, a contribution settled that much overdraft. Null
 * for a goal with no rows, or one that is not archived.
 */
export function heldAtArchive(entries: ActivityEntry[]): number | null {
  const last = [...entries].sort(chronological).at(-1);
  if (!last) return null;
  if (last.kind === "withdrawn") return last.amount;
  if (last.kind === "added") return -last.amount;
  return null;
}
