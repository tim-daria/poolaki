import { createContext } from "react";

/** Mirrors core.models.NotificationType on the backend. */
export type NotificationType =
  | "invitation"
  | "transaction_added"
  | "goal_completed"
  | "member_left"
  | "member_removed"
  | "removed_from_org"
  | "ownership_transferred"
  | "owner_changed"
  | "organization_deleted"
  | (string & {});

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

/** Sent to every remaining member when the owner removes someone. */
export type MemberRemovedPayload = {
  org_name: string;
  removed_user: string;
  removed_by: string;
};

/** Sent to the removed user; the org may no longer be visible to them. */
export type RemovedFromOrgPayload = {
  org_name: string;
  removed_by: string;
};

/** Sent to every remaining member when someone leaves. */
export type MemberLeftPayload = {
  user: string;
  org_name: string;
};

/** Sent to the member who became owner because the owner left. */
export type OwnershipTransferredPayload = {
  previous_owner: string;
  org_name: string;
};

/** Sent to the other remaining members when the owner left. */
export type OwnerChangedPayload = {
  previous_owner: string;
  new_owner: string;
  org_name: string;
};

/** Sent to pending invitees when the last member left; the org is gone. */
export type OrganizationDeletedPayload = {
  org_name: string;
  last_member: string;
};

/** Sent when a new transaction is added. */
export type TransactionAddedPayload = {
  added_by: string;
  org_name: string;
};

/** Sent when a goal is marked as completed. */
export type GoalCompletedPayload = {
  user: string;
  org_name: string;
  goal_name: string;
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
  /**
   * Fetches the panel's list. `signal` lets the caller abort when it goes
   * away; an aborted load resolves without writing state, any other failure
   * rejects so the caller can tell "failed" from "empty".
   */
  loadFullList: (isRead?: boolean, signal?: AbortSignal) => Promise<void>;
  /** Marks all currently-loaded unread rows read via POST /clear-all/. */
  clearAll: (csrfToken: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export const NotificationContext =
  createContext<NotificationContextType | null>(null);
