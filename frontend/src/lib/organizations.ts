/**
 * All organization HTTP lives here. Components ask *what*, not *how*.
 *
 * Unlike lib/initialBalance.ts (which returns {ok, error}), these throw error.
 * Callers need to tell 403 "not a member" apart from 500 "server is down",
 * and a boolean can't express that.
 *
 * Every call passes `credentials: "include"`. The session cookie IS the auth —
 * without it Django sees an anonymous request and returns 403, a failure that
 * looks exactly like a permissions bug.
 */

/** Thrown when the backend says the user is not a member of the org. */
export class OrgForbiddenError extends Error {}

/** Mirrors core.models.Role. */
export type Role = "OWNER" | "MEMBER";

export type Organization = {
  id: number;
  name: string;
  is_personal: boolean;
  role: Role;
};

export type OrganizationList = {
  /** The org stored in the Django session — a hint for "/" only, never authority. */
  current_organization_id: number | null;
  organizations: Organization[];
};

/** GET /api/organizations/ */
export async function fetchOrganizations(
  signal?: AbortSignal,
): Promise<OrganizationList> {
  const res = await fetch("/api/organizations/", {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load workspaces (${res.status})`);
  return res.json();
}

/**
 * POST /api/organizations/{orgId}/select/
 *
 * Writes current_organization_id into the Django session. Today that's the
 * bridge that makes the session follow the URL; after the backend accepts
 * org-scoped paths it degrades to a "last used" hint for "/".
 */
export async function selectOrganization(
  orgId: number,
  csrfToken: string,
): Promise<{ current_organization_id: number }> {
  const res = await fetch(`/api/organizations/${orgId}/select/`, {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    credentials: "include",
  });
  // A typed error, so callers can `instanceof` instead of string-matching a
  // message — OrgLayout needs "not a member" (show NoAccessScreen) to be
  // distinguishable from "server is down" (show a retry).
  if (res.status === 403) {
    throw new OrgForbiddenError("You are not a member of this organization");
  }
  if (!res.ok) throw new Error(`Failed to switch workspace (${res.status})`);
  return res.json();
}

/**
 * POST /api/organizations/
 *
 * The backend auto-selects the new org server-side (views.py:159-160).
 */
export async function createOrganization(
  name: string,
  initialBalance: number,
  csrfToken: string,
): Promise<Organization & { initial_balance: string }> {
  const res = await fetch("/api/organizations/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    credentials: "include",
    body: JSON.stringify({ name, initial_balance: initialBalance }),
  });
  if (!res.ok) throw new Error(`Failed to create workspace (${res.status})`);
  return res.json();
}
