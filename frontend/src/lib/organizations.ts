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
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new WorkspaceRequestError(
      errorMessageFrom(body, "Could not create the workspace"),
    );
  }
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
 * Separate from a plain Error because the backend rejected the request with a
 * message meant for the user — unknown username, workspace full, member
 * already gone — and that belongs in the UI, not in a generic "something went
 * wrong".
 */
export class WorkspaceRequestError extends Error {}

/**
 * First user-facing message in a 400 body. The API answers in three shapes:
 * `{errors: [...]}` from services, `{error: "..."}` from older views, and
 * `{field: [...]}` from serializers. Exported for tests.
 */
export function errorMessageFrom(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null) return fallback;
  const rec = body as Record<string, unknown>;
  const firstString = (v: unknown): string | undefined =>
    Array.isArray(v) && typeof v[0] === "string" ? v[0] : undefined;
  const fromErrors = firstString(rec.errors);
  if (fromErrors) return fromErrors;
  if (typeof rec.error === "string" && rec.error) return rec.error;
  for (const value of Object.values(rec)) {
    const msg = firstString(value);
    if (msg) return msg;
  }
  return fallback;
}

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
    throw new WorkspaceRequestError(
      errorMessageFrom(body, "Could not send the invitation"),
    );
  }
  if (!res.ok) throw new Error(`Failed to send invitation ${res.status}`);
  return res.json();
}

/** POST /api/v1/organizations/${org_id}/invitations/${invitation_id}/cancel/ */
export async function cancelInvitation(
  org_id: number,
  invitation_id: number,
  csrfToken: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/organizations/${org_id}/invitations/${invitation_id}/cancel/`,
    {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken },
      credentials: "include",
    },
  );
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new WorkspaceRequestError(
      errorMessageFrom(body, "Could not cancel the invitation"),
    );
  }
  if (!res.ok) throw new Error(`Failed to cancel invitation ${res.status}`);
}

/**
 * DELETE /api/v1/organizations/${org_id}/members/${user_id}/
 *
 * Owner-only. A 400 means the row is stale — the user already left or was
 * removed — so callers should refetch rather than retry.
 */
export async function removeMember(
  org_id: number,
  user_id: number,
  csrfToken: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/organizations/${org_id}/members/${user_id}/`,
    {
      method: "DELETE",
      headers: { "X-CSRFToken": csrfToken },
      credentials: "include",
    },
  );
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new WorkspaceRequestError(
      errorMessageFrom(body, "Could not remove the member"),
    );
  }
  if (!res.ok) throw new Error(`Failed to remove member ${res.status}`);
}

/** Mirrors invitations[] in MyInvitationsView.get */
export type MyInvitation = {
  id: number;
  organization_id: number;
  organization_name: string;
  invited_by: string | null;
  created_at: string;
};

/** GET /api/v1/invitations/my/ — pending invitations addressed to the user. */
export async function fetchMyInvitations(
  signal?: AbortSignal,
): Promise<{ invitations: MyInvitation[] }> {
  const res = await fetch("/api/v1/invitations/my/", {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load invitations (${res.status})`);
  return res.json();
}

/**
 * Mirrors MAX_MEMBERS_PER_ORG in core/services/organization.py. Duplicated
 * rather than fetched: the backend enforces it regardless, so the worst a
 * drift can do here is offer an invite that comes back rejected.
 */
export const MAX_MEMBERS = 5;

/**
 * Mirrors MAX_ORGS_PER_USER in core/services/organization.py. Counts every
 * membership, the personal workspace included, as the backend does.
 */
export const MAX_ORGS = 10;

/**
 * Owners first, then by join date. The endpoint returns memberships in no
 * particular order, and an owner buried mid-list reads as a plain member.
 */
export function byRoleThenJoined(a: Member, b: Member): number {
  if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
  return a.joined_at.localeCompare(b.joined_at);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Settings row subtitle, e.g. "4 members · 1 invited · you're the owner".
 * Counts are optional because they load per workspace after the list renders;
 * until then only the role is shown.
 */
export function describeWorkspace(
  org: Pick<Organization, "is_personal" | "role">,
  memberCount?: number,
  inviteCount?: number,
): string {
  if (org.is_personal) return "Personal · only you";
  const parts: string[] = [];
  if (memberCount !== undefined) parts.push(plural(memberCount, "member"));
  if (inviteCount) parts.push(`${inviteCount} invited`);
  parts.push(org.role === "owner" ? "you're the owner" : "member");
  return parts.join(" · ");
}

// Flags for workspace actions whose backend routes don't exist yet. The UI
// renders them disabled so the layout is final; delete a flag once its route
// lands (member removal already has).
export const CAN_RENAME_ORGANIZATION = false;
export const CAN_DELETE_ORGANIZATION = false;
export const CAN_LEAVE_ORGANIZATION = false;
