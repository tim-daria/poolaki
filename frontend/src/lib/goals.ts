/** @file Goal types, form draft, and API calls. Reads are seeded until a goals API exists. */

import { TODAY } from "./date";
import { toMoneyString, validateAmount } from "./money";
import { formatName } from "./text";

/**
 * TODO: no goals API exists (core.models.Goal has no route), so SEED_GOALS
 * stands in, the way categories did before they moved to fetchCategories in
 * lib/categories.ts. A contribution is rejected with 400
 * unless a Goal row with that id exists for the workspace
 * (TransactionCreateSerializer.validate_goal_id). Replace with a fetch once
 * the endpoints land; goalById keeps its signature.
 */

export type GoalIcon = "emergency" | "house" | "vacation" | "loan" | "laptop" | "sport";

/** Mirrors core.models.Goal, plus the progress the picker shows. */
export type Goal = {
  id: number;
  name: string;
  target_amount: number;
  /** Derived on the server from the goal's contributions, never sent up. */
  saved_amount: number;
  /** "YYYY-MM-DD", or null for a goal with no deadline. */
  target_date: string | null;
  icon: GoalIcon;
  paid_off: boolean;
};

export const SEED_GOALS: Goal[] = [
  {
    id: 1,
    name: "New laptop",
    target_amount: 2000,
    saved_amount: 1790,
    target_date: "2026-12-31",
    icon: "laptop", 
    paid_off: false
  },
  {
    id: 2,
    name: "Emergency fund",
    target_amount: 3000,
    saved_amount: 620,
    target_date: null,
    icon: "emergency",
    paid_off: false
  },
  { id: 3,
    name: "Student loan",
    target_amount: 12000,
    saved_amount: 12000,
    target_date: "2024-01-01",
    icon: "loan",
    paid_off: true
  },
  {
    id: 4,
    name: "Vacation fund",
    target_amount: 1500,
    saved_amount: 1500,
    target_date: "2024-06-01",
    icon: "vacation",
    paid_off: true,
  },
  // {
  //   id: 5,
  //   name: "Wedding rings",
  //   target_amount: 900,
  //   saved_amount: 900,
  //   target_date: "2023-08-15",
  //   icon: "vacation",
  //   paid_off: true,
  // },
];

/**
 * TODO: no goals API exists yet. Swap the body for a real fetch
 * (`GET /api/v1/organizations/${org_id}/goals/`) once it lands, the
 * signature (org_id in, Promise<Goal[]> out) is written to match that call,
 * so Goals.tsx does not need to change, just the `await` it already has room for.
 */
export async function getGoals(_org_id: number): Promise<Goal[]> {
  return SEED_GOALS;
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
};

function fromDTO(d: GoalDTO): Goal {
  return {
    id: d.id,
    name: d.name,
    target_amount: Number(d.target_amount),
    saved_amount: Number(d.saved_amount),
    target_date: d.target_date,
    // Not sent by the backend yet — safe defaults until it is.
    icon: "emergency",
    paid_off: false,
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
