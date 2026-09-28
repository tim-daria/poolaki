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

/** Mirrors members[] in OrganizationMemberView */
export type Member = {
  user_id: number;
  username: string;
  role: Role;
  joined_at: string;
};

export type OrganizationList = {
  organizations: Organization[];
};

/** GET /api/v1/organizations/ */
export async function fetchOrganizations(
  signal?: AbortSignal,
): Promise<OrganizationList> {
  const res = await fetch("/api/v1/organizations/", {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load workspaces (${res.status})`);
  return res.json();
}

/**
 * POST /api/v1/organizations/
 * the backend only creates the org; the caller navigates to /o/:orgId
 */
export async function createOrganization(
  name: string,
  initialBalance: number,
  csrfToken: string,
): Promise<Organization & { initial_balance: string }> {
  const res = await fetch("/api/v1/organizations/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    credentials: "include",
    body: JSON.stringify({ name, initial_balance: initialBalance }),
  });
  if (!res.ok) throw new Error(`Failed to create workspace (${res.status})`);
  return res.json();
}

/**
 * GET /api/v1/organizations/${org_id}/members/
 */
export async function fetchMembers(
  org_id: number,
  signal?: AbortSignal,
): Promise<{ members: Member[] }> {
  const res = await fetch(`/api/v1/organizations/${org_id}/members/`, {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw Error(`Failed to load members of (${res.status})`);
  return res.json();
}

export type Invitation = {
  id: number;
  invited_user: string;
  status: string;
};

/** Mirrors invitations[] in InvitationListCreateView.get */
export type PendingInvitation = Invitation & {
  invited_by: string | null;
};

/**
 * GET /api/v1/organizations/${org_id}/invitations/
 *
 * Owner-only: a plain member gets a 403. Callers that show this alongside the
 * member list should skip it unless `org.role === "owner"`, rather than treat
 * the 403 as a failure.
 */
export async function fetchPendingInvitations(
  org_id: number,
  signal?: AbortSignal,
): Promise<{ invitations: PendingInvitation[] }> {
  const res = await fetch(`/api/v1/organizations/${org_id}/invitations/`, {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load invitations (${res.status})`);
  return res.json();
}

/**
 * Backend's 400 message, e.g. "No user found with this username."
 *
 * Separate from a plain Error because these are the user's own input —
 * unknown username, already a member, org full — and belong in the form,
 * not in a generic "something went wrong".
 */
export class InvitationCreateError extends Error {}

/** POST /api/v1/organizations/${org_id}/invitations/ */
export async function createInvitation(
  org_id: number,
  username: string,
  csrfToken: string,
): Promise<Invitation> {
  const res = await fetch(`/api/v1/organizations/${org_id}/invitations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    credentials: "include",
    body: JSON.stringify({ username }),
  });
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new InvitationCreateError(
      // Three shapes: the service rejects the request as {errors: [...]},
      // legacy code as {error: "..."}, the serializer the field as {username: [...]}.
      body?.errors?.[0] ??
        body?.error ??
        body?.username?.[0] ??
        "Could not send the invitation",
    );
  }
  if (!res.ok) throw new Error(`Failed to send invitation ${res.status}`);
  return res.json();
}
