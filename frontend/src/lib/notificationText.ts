/**
 * @file Copy and attribution for notification rows, keyed by backend type.
 * Kept free of React so the mapping is unit-testable.
 */

import type {
  InvitationPayload,
  MemberRemovedPayload,
  NotificationType,
  RemovedFromOrgPayload,
} from "../context/NotificationContext";

type Payload = Record<string, unknown>;

/** Shown when a payload lacks the name of whoever acted. */
const UNKNOWN_ACTOR = "User";

export function isInvitationPayload(p: Payload): p is InvitationPayload {
  return (
    typeof p.invitation_id === "number" && typeof p.invited_by === "string"
  );
}

export function isMemberRemovedPayload(p: Payload): p is MemberRemovedPayload {
  return (
    typeof p.org_name === "string" &&
    typeof p.removed_user === "string" &&
    typeof p.removed_by === "string"
  );
}

export function isRemovedFromOrgPayload(
  p: Payload,
): p is RemovedFromOrgPayload {
  return typeof p.org_name === "string" && typeof p.removed_by === "string";
}

/**
 * One-line body text. Payloads are validated per type because the backend
 * treats them as type-specific JSON; a malformed one degrades to generic copy
 * rather than "undefined removed you from undefined".
 */
export function typeText(type: NotificationType, p: Payload): string {
  switch (type) {
    case "invitation":
      return isInvitationPayload(p)
        ? `${p.invited_by} invited you to ${p.org_name} workspace`
        : "You have a new invitation";
    case "transaction_added":
      return "A new transaction was added";
    case "goal_completed":
      return "A spending goal has been achieved";
    case "member_left":
      return "A member left the workspace";
    case "member_removed":
      return isMemberRemovedPayload(p)
        ? `${p.removed_by} removed ${p.removed_user} from ${p.org_name}`
        : "A member was removed from a workspace";
    case "removed_from_org":
      return isRemovedFromOrgPayload(p)
        ? `${p.removed_by} removed you from ${p.org_name}`
        : "You were removed from a workspace";
    default:
      return "Notification";
  }
}

/** Who the row is attributed to: its title and avatar initials. */
export function actorName(type: NotificationType, p: Payload): string {
  switch (type) {
    case "invitation":
      return isInvitationPayload(p) ? p.invited_by : UNKNOWN_ACTOR;
    case "member_removed":
    case "removed_from_org":
      return isRemovedFromOrgPayload(p) ? p.removed_by : UNKNOWN_ACTOR;
    default:
      return UNKNOWN_ACTOR;
  }
}
