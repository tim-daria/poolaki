import { createContext } from "react"

export type InvitationPayload = {
  invitation_id: number;
  org_id: number;
  org_name: string;
  invited_by: string;
};

/** Later we can include also transactions, goals, if a member left */
export type NotificationType = "invitation";

export type Notification = {
  id: number;
  type: NotificationType;
  payload: InvitationPayload | Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

/** Shape of what NotificationProvider exposes via context. */
export type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  loadFullList: (isRead?: boolean) => Promise<void>;
  clearAll: (csrfToken: string) => Promise<void>;
};

export const NotificationContext = createContext<NotificationContextType | null>(null);