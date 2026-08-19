import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { NotificationContext } from "./NotificationContext";
import { fetchNotifications } from "../lib/notifications";
import type { Notification } from "./NotificationContext";

/**
 * How often we re-check for new notifications. It's not exactly WebSockets/SSE 
 * But it makes closer to a stand-in for real-time
 */
const POLL_INTERVAL_MS = 15000;

/**
 * Holds the user's notifications. Same reasoning as OrgListProvider:
 * Mounted as a pathless layout route inside protectedRoute,
 * so it unmounts on logout rather than leaking into the next user's session.
 */
export function NotificationProvider() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const load = async (signal?: AbortSignal) => {
    try {
      const list = await fetchNotifications(signal);
      setNotifications(list);
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
   * Opening the panel clears the red dot without deleting notifications —
   * marks everything currently loaded as read, locally. A real "mark as
   * read" backend call can replace/augment this once that endpoint exists.
   */
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  /** Clears the panel. A real "delete all" backend call belongs here once
   * that endpoint exists — for now this only clears local state. */
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