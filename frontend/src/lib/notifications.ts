/**
 * All notification HTTP lives here. Components ask *what*, not *how*.
 */
import type { Notification } from "../context/NotificationContext";
import { mockNotifications } from "./mockup/mockNotifications";// test

type NotificationList = {
  notifications: Notification[];
};

/** GET /api/notifications/ */
export async function fetchNotificationsReal(
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

/** TEMPORARY — mock while GET /api/notifications/ isn't implemented yet. */
async function fetchNotificationsMock(_signal?: AbortSignal): Promise<Notification[]> {
  return Promise.resolve(mockNotifications);
}

// TEMPORAL: swap this line back to fetchNotificationsReal once the backend
// endpoint exists.
export const fetchNotifications = fetchNotificationsMock;