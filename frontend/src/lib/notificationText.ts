/**
 * @file Copy and attribution for notification rows, keyed by backend type.
 * Kept free of React so the mapping is unit-testable.
 */

import type {
  InvitationPayload,
  MemberLeftPayload,
  MemberRemovedPayload,
  NotificationType,
  OrganizationDeletedPayload,
  OwnerChangedPayload,
  OwnershipTransferredPayload,
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

export function isMemberLeftPayload(p: Payload): p is MemberLeftPayload {
  return typeof p.org_name === "string" && typeof p.user === "string";
}

export function isOwnershipTransferredPayload(
  p: Payload,
): p is OwnershipTransferredPayload {
  return typeof p.org_name === "string" && typeof p.previous_owner === "string";
}

/** Stricter than the transferred payload: it also names the new owner. */
export function isOwnerChangedPayload(p: Payload): p is OwnerChangedPayload {
  return (
    typeof p.org_name === "string" &&
    typeof p.previous_owner === "string" &&
    typeof p.new_owner === "string"
  );
}

export function isOrganizationDeletedPayload(
  p: Payload,
): p is OrganizationDeletedPayload {
  return typeof p.org_name === "string" && typeof p.last_member === "string";
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
      return isMemberLeftPayload(p)
        ? `${p.user} left ${p.org_name}`
        : "A member left the workspace";
    case "member_removed":
      return isMemberRemovedPayload(p)
        ? `${p.removed_by} removed ${p.removed_user} from ${p.org_name}`
        : "A member was removed from a workspace";
    case "removed_from_org":
      return isRemovedFromOrgPayload(p)
        ? `${p.removed_by} removed you from ${p.org_name}`
        : "You were removed from a workspace";
    case "ownership_transferred":
      return isOwnershipTransferredPayload(p)
        ? `${p.previous_owner} left ${p.org_name} — you're now the owner`
        : "You're now the owner of a workspace";
    case "owner_changed":
      return isOwnerChangedPayload(p)
        ? `${p.previous_owner} left ${p.org_name} — ${p.new_owner} is now the owner`
        : "A workspace has a new owner";
    case "organization_deleted":
      return isOrganizationDeletedPayload(p)
        ? `${p.org_name} was deleted after ${p.last_member} left, so your invitation no longer stands`
        : "A workspace you were invited to was deleted";
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
    case "member_left":
      return isMemberLeftPayload(p) ? p.user : UNKNOWN_ACTOR;
    case "ownership_transferred":
    case "owner_changed":
      return isOwnershipTransferredPayload(p)
        ? p.previous_owner
        : UNKNOWN_ACTOR;
    case "organization_deleted":
      return isOrganizationDeletedPayload(p) ? p.last_member : UNKNOWN_ACTOR;
    default:
      return UNKNOWN_ACTOR;
  }
}
