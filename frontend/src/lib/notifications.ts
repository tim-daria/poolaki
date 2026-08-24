/**
 * All notification HTTP lives here. Components ask *what*, not *how*.
 *
 * Like lib/organizations.ts, these throw on failure and every call passes
 * `credentials: "include"` — the session cookie IS the auth, without it
 * Django sees an anonymous request and returns 403.
 */
import type { Notification } from "../context/NotificationContext";

export async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  const res = await fetch("/api/notifications/unread-count/", { credentials: "include", signal });
  if (!res.ok) throw new Error(`Failed to load unread count (${res.status})`);
  const data = await res.json();
  return data.unread_count;
}

/** GET /api/notifications/ */
export async function fetchNotifications(isRead?: boolean, signal?: AbortSignal,): Promise<{notifications:Notification[]; unreadCount: number }> {
  const url = isRead === undefined ? "/api/notifications/" : `/api/notifications/?is_read=${isRead}`;
  const res = await fetch(url, { credentials: "include", signal });

  if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
  const data = await res.json();
  // console.log("Data coming from fetchNotifications:", data); //DEBUG

  return { notifications: data.notifications || [], unreadCount: data.unread_count ?? 0 };
}

export async function clearAllNotifications(ids: number[], csrfToken: string): Promise<number> {
  const res = await fetch("/api/notifications/clear-all/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    credentials: "include",
    body: JSON.stringify({ notification_ids: ids }),
  });
  if (!res.ok) throw new Error(`Failed to clear notifications (${res.status})`);
  const data = await res.json();
  return data.marked_read;
}

/**
 * GET /api/v1/notifications/unread-count/
 *
 * Cheap endpoint for the bell badge — the provider polls this instead of the
 * full 50-row list (which has a body the client doesn't need for a dot).
 */
export async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  const res = await fetch("/api/v1/notifications/unread-count/", {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load unread count (${res.status})`);
  const data = (await res.json()) as { unread_count: number };
  return data.unread_count;
}

export async function markNotificationsRead(
  notificationIds: number[],
  csrfToken: string,
): Promise<{ marked_read: number }> {
  const res = await fetch("/api/v1/notifications/clear-all/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({ notification_ids: notificationIds }),
  });
  if (!res.ok) throw new Error(`Failed to mark notifications as read (${res.status})`);
  return res.json();
}

export class InvitationResolveError extends Error {
  /** Backend's 400 message, e.g. "Invitation is already resolved". */
  constructor(message: string) {
    super(message);
  }
}

/**
 * POST /api/v1/invitations/{invitationId}/accept/
 *
 * Joins the organization as a member and marks the matching invitation
 * notification read. On 400 the backend's `error` message is wrapped in
 * InvitationResolveError so the UI can show it instead of a generic crash.
 */
export async function acceptInvitation(
  invitationId: number,
  csrfToken: string,
): Promise<{ organization_id: number; organization_name: string }> {
  const res = await fetch(`/api/v1/invitations/${invitationId}/accept/`, {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    credentials: "include",
  });
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new InvitationResolveError(body?.error ?? "Invitation could not be accepted");
  }
  if (!res.ok) throw new Error(`Failed to accept invitation (${res.status})`);
  return res.json();
}

/** POST /api/v1/invitations/{invitationId}/decline/ */
export async function declineInvitation(
  invitationId: number,
  csrfToken: string,
): Promise<{ invitation_id: number; status: string }> {
  const res = await fetch(`/api/v1/invitations/${invitationId}/decline/`, {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    credentials: "include",
  });
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new InvitationResolveError(body?.error ?? "Invitation could not be declined");
  }
  if (!res.ok) throw new Error(`Failed to decline invitation (${res.status})`);
  return res.json();
}
