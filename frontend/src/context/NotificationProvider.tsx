import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { NotificationContext } from "./NotificationContext";
import type { Notification } from "./NotificationContext";
import {
  fetchNotifications,
  markNotificationsRead,
} from "../lib/notifications";
import { getCsrfToken } from "../lib/csrf";

/**
 * How often we re-check for new notifications. It's not exactly WebSockets/SSE,
 * but it makes closer to a stand-in for real-time. The endpoint is a light
 * 50-row list of the user's own notifications only.
 */
const POLL_INTERVAL_MS = 15000;

/**
 * Holds the user's notifications. Same reasoning as OrgListProvider:
 * mounted as a pathless layout route inside protectedRoute,
 * so it unmounts on logout rather than leaking into the next user's session.
 */
export function NotificationProvider() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Stored separately (not derived from the list) because the backend knows
  // the true unread total even when the list is capped at 50 rows.
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async (signal?: AbortSignal) => {
    try {
      const data = await fetchNotifications(signal);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal).catch(() => {});

    const interval = setInterval(() => {
      void load().catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      ac.abort();
      clearInterval(interval);
    };
  }, []);

  /**
   * "The user has seen this": POST /api/notifications/clear-all/ with the ids of
   * the rows that are still unread (the client is the one that decides what
   * counts as "seen"). Pending invitations are included: marking them read
   * clears the badge while leaving the row visible — it stays until it is
   * accepted or declined (resolved ones drop out of the list on their own).
   */
  const markAllAsRead = async () => {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);

    if (ids.length > 0) {
      try {
        await markNotificationsRead(ids, getCsrfToken());
      } catch (err) {
        // Non-fatal: the badge and row state are refetched below, and the
        // next poll will self-correct if this request lost the race.
        console.error("Failed to mark notifications as read: %s", err);
      }
    }
    // Reload to sync with the backend (it may have dropped resolved
    // invitations from the list and recomputed the unread count).
    await load().catch(() => {});
  };

  /**
   * Clears the panel locally. The backend has no delete endpoint, so the
   * next poll brings the rows back — this is "hide from the panel", not
   * "destroy notifications".
   */
  const clearAll = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    clearAll,
    refresh: () => load(),
  };

  return (
    <NotificationContext.Provider value={value}>
      <Outlet />
    </NotificationContext.Provider>
  );
}
