import { createContext } from "react"

/** Mirrors core.models.NotificationType on the backend. */
export type NotificationType = "invitation"; "transaction_added"; "goal_completed"; "member_left";

/**
 * Matches the invitation payload the backend writes when an invitation is
 * created (see core/services/invitation.py). Other types may carry their own
 * fields — treat `payload` as type-specific.
 */
export type InvitationPayload = {
  invitation_id: number;
  org_id: number;
  org_name: string;
  invited_by: string;
};

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
  /** From the backend's `unread_count` — accurate even past the 50-row list cap. */
  unreadCount: number;
  loading: boolean;
  /** Marks all currently-loaded unread rows read via POST /clear-all/. */
  loadFullList: (isRead?: boolean) => Promise<void>;

  clearAll: (csrfToken: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export const NotificationContext = createContext<NotificationContextType | null>(null);
