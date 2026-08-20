import { createContext } from "react"

export type InvitationPayload = {
  invitation_id: number;
  invited_by: string;
};

/** Later we can include also transactions, goals, if a member left */
export type NotificationType = "invitation";

export type Notification = {
  id: number;
  type: NotificationType;
  org_id: number;
  org_name: string;
  payload: InvitationPayload | Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

/** Shape of what NotificationProvider exposes via context. */
export type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAllAsRead: () => void;
  clearAll: () => void;
  refresh: () => Promise<void>;
};

export const NotificationContext = createContext<NotificationContextType | null>(null);