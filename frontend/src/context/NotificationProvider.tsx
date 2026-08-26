import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { NotificationContext } from "./NotificationContext";
import {
  fetchUnreadCount,
  fetchNotifications,
  clearAllNotifications,
} from "../lib/notifications";
import type { Notification } from "./NotificationContext";

/**
 * How often we re-check for new notifications. It's not exactly WebSockets/SSE,
 * but it makes closer to a stand-in for real-time. The endpoint is a light
 * 50-row list of the user's own notifications only.
 */
const POLL_INTERVAL_MS = 60000;

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

  useEffect(() => {
    const ac = new AbortController();
    const poll = () =>
      fetchUnreadCount(ac.signal)
        .then((count) => {
          setUnreadCount(count);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      ac.abort();
      clearInterval(interval);
    };
  }, []);

  /**
   * Loads the panel's list. Same shape as OrgListProvider.load: try/catch
   * because React Compiler cannot process a try
   * without a catch — and rethrowing rather than swallowing, because "the
   * list failed" and "the list is empty" render differently.
   */
  const loadFullList = async (isRead?: boolean, signal?: AbortSignal) => {
    try {
      const data = await fetchNotifications(isRead, signal);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      // An abort is not a failure: the panel that asked for this has closed,
      // and a late write would clobber whatever replaced it.
      if (signal?.aborted) return;
      throw err;
    }
  };

  /**
   * Marks the loaded unread rows read via POST /clear-all/.
   *
   * Invitations are excluded because the backend ignores them anyway — only
   * accept/decline/cancel resolve an invitation (MarkAllNotificationsReadView).
   */
  const clearAll = async (csrfToken: string) => {
    const nonInvitationIds = notifications
      .filter((n) => n.type !== "invitation" && !n.is_read)
      .map((n) => n.id);
    if (nonInvitationIds.length === 0) return;
    await clearAllNotifications(nonInvitationIds, csrfToken);
    await loadFullList().catch(() => {});
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    loadFullList,
    clearAll,
    refresh: async () => {
      await loadFullList();
    },
  };

  return (
    <NotificationContext.Provider value={value}>
      <Outlet />
    </NotificationContext.Provider>
  );
}
