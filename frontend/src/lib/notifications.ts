/**
 * All notification HTTP lives here. Components ask *what*, not *how*.
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
  return { notifications: data.notifications, unreadCount: data.unread_count };
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