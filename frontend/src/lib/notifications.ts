/**
 * All notification HTTP lives here. Components ask *what*, not *how*.
 */
import type { Notification } from "../context/NotificationContext";

type NotificationList = {
  notifications: Notification[];
};

/** GET /api/notifications/ */
export async function fetchNotifications(
  signal?: AbortSignal,
): Promise<Notification[]> {
  const res = await fetch("/api/notifications/", {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
  const data: NotificationList = await res.json();
  return data.notifications;
}