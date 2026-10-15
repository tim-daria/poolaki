/** @file Goal types, form draft, and API calls. */

import { TODAY } from "./date";
import { parseMoney, toMoneyString, validateAmount } from "./money";
import { formatName } from "./text";
import { isRejection, rejectionMessage } from "./apiErrors";

/** Mirrors core.models.GoalStatus. */
export type GoalStatus = "active" | "completed" | "archived";

/**
 * The state a goal is shown in: what the wire says, and only that. Completion
 * is set by the user, so a goal past its target stays active until marked
 * completed; the amounts only feed flags and hints (see goalHint).
 */
export function goalState(g: Goal): GoalStatus {
  return g.status;
}

export const isArchived = (g: Goal) => goalState(g) === "archived";

/** An expense may be paid from this goal. The server decides; see `Goal.spendable`. */
export const isSpendable = (g: Goal) => g.spendable;

export const targetReached = (g: Goal) => g.balance >= g.target_amount;

/**
 * The one thing to tell the user about an active goal: it is full but not
 * marked completed, so nothing can be spent from it yet. Null otherwise.
 */
export function goalHint(g: Goal): string | null {
  return g.status === "active" && targetReached(g)
    ? "Target reached. Mark it as completed to spend from it."
    : null;
}

/** Chip text per flag. Exhaustive: a flag without a label fails to compile. */
export const FLAG_LABEL: Record<GoalFlag, string> = {
  overdue: "Overdue",
};

/**
 * What the progress bar draws, per state. Palette paths for `sx`. Past 100%
 * the light track stands for the planned 100% and the bar draws only the
 * excess, as if filling again, so 120% shows a 20% bar; `pct` stays honest
 * for the label and assistive tech. Archived is dimmed, bar included: a full
 * primary bar would read as "in progress".
 */
export type BarLook = {
  pct: number;
  barValue: number;
  track: string;
  fill: string;
};

export function goalBarLook(g: Goal): BarLook {
  const pct =
    g.target_amount === 0 ? 0 : Math.round((g.balance / g.target_amount) * 100);
  switch (goalState(g)) {
    case "archived":
      return {
        pct,
        barValue: Math.min(100, pct),
        track: "action.disabledBackground",
        fill: "text.disabled",
      };
    case "completed":
      return {
        pct,
        // Marked completed short of the target is possible, so no assumption of >=100.
        barValue: pct > 100 ? Math.min(100, pct - 100) : pct,
        track: "success.light",
        fill: "success.main",
      };
    case "active":
      return {
        pct,
        barValue: Math.min(100, pct),
        track: "primary.light",
        fill: "primary.dark",
      };
  }
}

/** Mirrors core.models.Goal, plus the progress the picker shows. */
export type Goal = {
  id: number;
  name: string;
  target_amount: number;
  /** Contributions minus withdrawals and expenses paid from it;
   * what counts toward the target. Negative once expenses exceed what was saved.
   */
  balance: number;
  /**
   * Whether an expense may be paid from this goal. The server's rule is
   * "completed, or active with no target date", and it rejects an expense
   * against any other goal with a 400.
   */
  spendable: boolean;
  /** balance / target_amount, as the server computes it; unclamped. */
  progress: number;
  /** Server-side: target_date is before today and the goal is not completed. */
  overdue: boolean;
  /** ISO date set when marked completed, null otherwise. */
  completed_at: string | null;
  /** Username, or null when the creator's account is gone. */
  created_by: string | null;
  /** "YYYY-MM-DD", or null for a goal with no deadline. */
  target_date: string | null;
  status: GoalStatus;
  /** ISO datetime, as DRF serialises Goal.created_at; lists sort on it. */
  created_at: string;
};

/**
 * Conditions worth calling out on a goal. Extend the union to add one; the card
 * renders whatever comes back. TODO: "off_limits" (spent more than planned) joins
 * once contributions are wired up — it needs transaction data, so goalFlags will
 * grow a parameter then; the list shape stays.
 */
export type GoalFlag = "overdue";

/**
 * Flags for a goal, in display order. Overdue means the deadline passed with
 * the target unmet; it persists once a goal is archived, and never applies to
 * a completed one. ISO "YYYY-MM-DD" strings compare correctly as strings; a
 * goal due today is not overdue.
 */
export function goalFlags(g: Goal, today: string = TODAY): GoalFlag[] {
  const flags: GoalFlag[] = [];
  const unmet = g.status !== "completed" && !targetReached(g);
  if (unmet && g.target_date !== null && g.target_date < today) {
    flags.push("overdue");
  }
  return flags;
}

/**
 * List order within a section: oldest first, so a new goal appends rather
 * than jumping to the front. ISO datetimes in one format compare correctly as
 * strings. The page splits by state before sorting, so state is not part of it.
 */
export function oldestFirst(a: Goal, b: Goal): number {
  return a.created_at.localeCompare(b.created_at);
}

/** GET /api/v1/organizations/${org_id}/goals/ — every status; the page splits them. */
export async function getGoals(
  org_id: number,
  signal?: AbortSignal,
): Promise<Goal[]> {
  const res = await fetch(`/api/v1/organizations/${org_id}/goals/`, {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load goals (${res.status})`);
  const body: { goals: GoalDTO[] } = await res.json();
  return body.goals.map(fromDTO);
}

export function goalById(goals: Goal[], id: number | null): Goal | undefined {
  return id === null ? undefined : goals.find((g) => g.id === id);
}

/* ---------------------------------- */
/*             Form state             */
/* ---------------------------------- */

/** What the "Add goal" form collects. Progress is not the user's to set. */
export type GoalDraft = {
  name: string;
  /** Canonical amount ("480.00") while it is being typed — see lib/money.ts. */
  target_amount: string;
  /** "YYYY-MM-DD", or "" when cleared. */
  target_date: string;
};

/** Blank, date included: no deadline is the default, not today. */
export function emptyGoalDraft(): GoalDraft {
  return { name: "", target_amount: "", target_date: "" };
}

/** Validates the draft before submission. Returns an error message or null. */
export function validateGoalDraft(draft: GoalDraft): string | null {
  if (!draft.name.trim()) return "Name is required.";
  const amountProblem = validateAmount(draft.target_amount);
  if (amountProblem) return amountProblem;
  return null;
}

/** The form's view of an existing goal, for edit mode. */
export function toGoalDraft(g: Goal): GoalDraft {
  return {
    name: g.name,
    target_amount: toMoneyString(g.target_amount),
    target_date: g.target_date ?? "",
  };
}

/* ---------------------------------- */
/*                HTTP                */
/* ---------------------------------- */

/** A 400 or 403 whose message belongs in the form, as opposed to a network failure. */
export class GoalError extends Error {}

/** Raw API shape the endpoint is expected to return; mirrors the model. */
type GoalDTO = {
  id: number;
  name: string;
  /** String to preserve decimal precision. */
  target_amount: string;
  balance: string;
  spendable: boolean;
  progress: string;
  overdue: boolean;
  completed_at: string | null;
  created_by: string | null;
  target_date: string | null;
  /** Raw; parseGoalStatus validates it at the boundary. */
  status: string;
  created_at: string;
};

/** Parses the API's status field; throws on an unknown or missing value. */
function parseGoalStatus(wire: string): GoalStatus {
  switch (wire) {
    case "active":
    case "completed":
    case "archived":
      return wire;
    default:
      throw new Error(`Unknown goal status from API: ${wire}`);
  }
}

function fromDTO(d: GoalDTO): Goal {
  return {
    id: d.id,
    name: d.name,
    target_amount: parseMoney(d.target_amount),
    balance: parseMoney(d.balance),
    spendable: d.spendable,
    progress: parseMoney(d.progress),
    overdue: d.overdue,
    completed_at: d.completed_at,
    created_by: d.created_by,
    target_date: d.target_date,
    status: parseGoalStatus(d.status),
    created_at: d.created_at,
  };
}

/** POST /api/v1/organizations/${org_id}/goals/ — written against the route as it will be. */
export async function createGoal(
  org_id: number,
  draft: GoalDraft,
  csrfToken: string,
): Promise<Goal> {
  const res = await fetch(`/api/v1/organizations/${org_id}/goals/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    credentials: "include",
    body: JSON.stringify({
      name: formatName(draft.name),
      target_amount: toMoneyString(Number(draft.target_amount)),
      target_date: draft.target_date || null,
    }),
  });
  if (isRejection(res)) {
    throw new GoalError(await rejectionMessage(res, "Could not save the goal"));
  }
  if (!res.ok) throw new Error(`Failed to create goal (${res.status})`);
  return fromDTO(await res.json());
}

/** Fields PATCH accepts. Omitted means unchanged; `target_date: null` clears it. */
export type GoalPatch = {
  name?: string;
  target_amount?: string;
  target_date?: string | null;
  status?: GoalStatus;
};

/**
 * Only what differs from `original`: the server rejects an empty body, so the
 * caller skips the request when this is `{}`.
 */
export function goalPatch(
  original: Goal,
  draft: GoalDraft,
  status: GoalStatus,
): GoalPatch {
  const patch: GoalPatch = {};
  const name = formatName(draft.name);
  if (name !== original.name) patch.name = name;
  const amount = toMoneyString(Number(draft.target_amount));
  if (amount !== toMoneyString(original.target_amount))
    patch.target_amount = amount;
  const date = draft.target_date || null;
  if (date !== original.target_date) patch.target_date = date;
  if (status !== original.status) patch.status = status;
  return patch;
}

/** PATCH /api/v1/organizations/${org_id}/goals/${id}/ — owner or creator only (403 otherwise). */
export async function updateGoal(
  org_id: number,
  id: number,
  patch: GoalPatch,
  csrfToken: string,
): Promise<Goal> {
  const res = await fetch(`/api/v1/organizations/${org_id}/goals/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  if (isRejection(res)) {
    throw new GoalError(
      await rejectionMessage(res, "Could not update the goal"),
    );
  }
  if (!res.ok) throw new Error(`Failed to update goal (${res.status})`);
  const body: { goal: GoalDTO } = await res.json();
  return fromDTO(body.goal);
}
