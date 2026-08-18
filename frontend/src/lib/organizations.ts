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

/** Mirrors core.models.Role. */
export type Role = "owner" | "member";

export type Organization = {
  id: number;
  name: string;
  is_personal: boolean;
  role: Role;
};

export type OrganizationList = {
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
 * POST /api/organizations/
 * the backend only creates the org; the caller navigates to /o/:orgId
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
