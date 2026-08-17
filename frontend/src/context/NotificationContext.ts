import { createContext } from "react"

/** Later we can include also transactions, goals, if a member left */
export type NotificationType = "invitation";

export type InvitationPayload = {
  invitation_id: number;
  org_name: string;
  invited_by: string;
};

export type Notification = {
  id: number;
  type: NotificationType;
  payload: InvitationPayload | Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  org: number | null;
};