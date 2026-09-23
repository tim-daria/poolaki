/** @file Goal types, form draft, and API calls. Reads are seeded until a goals API exists. */

import { TODAY } from "./date";
import { parseMoney, toMoneyString, validateAmount } from "./money";
import { formatName } from "./text";
import { SEED_GOALS, seedIsEmptied } from "./goals.seed";

/**
 * TODO: no goals API exists (core.models.Goal has no route), so SEED_GOALS
 * (lib/goals.seed.ts) stands in, the way categories did before they moved to fetchCategories in
 * lib/categories.ts. A contribution is rejected with 400
 * unless a Goal row with that id exists for the workspace
 * (TransactionCreateSerializer.validate_goal_id). Replace with a fetch once
 * the endpoints land; goalById keeps its signature.
 */

/** Mirrors core.models.GoalStatus. */
export type GoalStatus = "active" | "completed" | "archived";

/**
 * The state a goal is shown in. Completion is derived, never set: a goal that has
 * reached its target is "completed" while it stays un-archived. Only "archived"
 * comes from the wire; if the backend ever sends "completed" the amounts still
 * decide, so the two cannot disagree.
 */
export function goalState(g: Goal): GoalStatus {
  if (g.status === "archived") return "archived";
  return g.saved_amount >= g.target_amount ? "completed" : "active";
}

export const isArchived = (g: Goal) => goalState(g) === "archived";

/** Mirrors core.models.Goal, plus the progress the picker shows. */
export type Goal = {
  id: number;
  name: string;
  target_amount: number;
  /** Derived on the server from the goal's contributions, never sent up. */
  saved_amount: number;
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
 * Flags for a goal, in display order. Derived from the amounts and dates, not
 * from the state, so they persist once a goal is archived. ISO "YYYY-MM-DD"
 * strings compare correctly as strings; a goal due today is not overdue.
 */
export function goalFlags(g: Goal, today: string = TODAY): GoalFlag[] {
  const flags: GoalFlag[] = [];
  const reached = g.saved_amount >= g.target_amount;
  if (!reached && g.target_date !== null && g.target_date < today) {
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

/**
 * TODO: no goals API exists yet. Swap the body for a real fetch
 * (`GET /api/v1/organizations/${org_id}/goals/`) once it lands, the
 * signature (org_id in, Promise<Goal[]> out) is written to match that call,
 * so Goals.tsx does not need to change, just the `await` it already has room for.
 */
export async function getGoals(org_id: number): Promise<Goal[]> {
  void org_id; // TODO: use once the fetch call replaces the seed
  return seedIsEmptied() ? [] : SEED_GOALS;
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

/** Seeded with today, like the transaction date. */
export function emptyGoalDraft(): GoalDraft {
  return { name: "", target_amount: "", target_date: TODAY };
}

/**
 * Validates the draft before submission. Returns an error message or null.
 * The date is required because core.models.Goal.target_date is NOT NULL.
 */
export function validateGoalDraft(draft: GoalDraft): string | null {
  if (!draft.name.trim()) return "Name is required.";
  const amountProblem = validateAmount(draft.target_amount);
  if (amountProblem) return amountProblem;
  if (!draft.target_date) return "Pick a target date.";
  return null;
}

/* ---------------------------------- */
/*                HTTP                */
/* ---------------------------------- */

/**
 * Flip once core/urls.py routes goals. Until then the form shows a notice and
 * keeps Create disabled, so nothing pretends to persist a goal.
 */
export const CAN_CREATE_GOALS = false;

/** A 400 whose message belongs in the form, as opposed to a network failure. */
export class GoalError extends Error {}

/** Raw API shape the endpoint is expected to return; mirrors the model. */
type GoalDTO = {
  id: number;
  name: string;
  /** String to preserve decimal precision. */
  target_amount: string;
  saved_amount: string;
  target_date: string | null;
  /**
   * Raw, not GoalStatus: no serializer sends this yet, so the boundary
   * validates it (parseGoalStatus) rather than assuming it, unlike
   * entry_type in lib/transactions.ts whose serializer already exists.
   */
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
    saved_amount: parseMoney(d.saved_amount),
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
      target_date: draft.target_date,
    }),
  });
  if (res.status === 400) {
    const body: unknown = await res.json().catch(() => null);
    throw new GoalError(firstMessage(body) ?? "Could not save the goal");
  }
  if (!res.ok) throw new Error(`Failed to create goal (${res.status})`);
  return fromDTO(await res.json());
}

/** First string found in a DRF error body: {field: [msg]}, {detail: msg} or [msg]. */
function firstMessage(body: unknown): string | null {
  if (typeof body === "string") return body;
  if (Array.isArray(body)) return body.length ? firstMessage(body[0]) : null;
  if (body && typeof body === "object") {
    for (const value of Object.values(body)) {
      const found = firstMessage(value);
      if (found) return found;
    }
  }
  return null;
}
