import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { NotificationContext } from "./NotificationContext";
import { fetchUnreadCount, fetchNotifications, clearAllNotifications } from "../lib/notifications";
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
    const poll = () => fetchUnreadCount(ac.signal).then((count) => { 
          setUnreadCount(count); setLoading(false); })
          .catch(() => setLoading(false));
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => { ac.abort(); clearInterval(interval); };
  }, []);

  const loadFullList = async (isRead?: boolean) => {
  const { notifications, unreadCount } = await fetchNotifications(isRead);
  setNotifications(notifications);
  setUnreadCount(unreadCount);
};

  /** Clears the panel. A real "delete all" backend call belongs here once
   * that endpoint exists — for now this only clears local state. */
  const clearAll = async (csrfToken: string) => { const nonInvitationIds = notifications
    .filter((n) => n.type !== "invitation" && !n.is_read)
    .map((n) => n.id);
    if (nonInvitationIds.length === 0) return;
    await clearAllNotifications(nonInvitationIds, csrfToken);
    await loadFullList(); 
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
