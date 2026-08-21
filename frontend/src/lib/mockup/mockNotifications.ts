/**
 * TEMPORARY — mock data to test the notification UI while
 * GET /api/v1/notifications/ isn't implemented yet in the backend.
 * Delete this whole `mockup/` folder once the real endpoint is ready.
 */
import type { Notification } from "../../context/NotificationContext";

export const mockNotifications: Notification[] = [
  {
    id: 2,
    type: "invitation",
    org_id: 4,
    org_name: "Vacation Fund",
    payload: { invitation_id: 2, invited_by: "alice" },
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
  },
  {
    id: 1,
    type: "invitation",
    org_id: 3,
    org_name: "myShared",
    payload: { invitation_id: 1, invited_by: "test1" },
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // an hour ago
  },
];