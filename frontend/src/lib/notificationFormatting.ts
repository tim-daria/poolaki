import type {
  NotificationType,
  InvitationPayload,
} from "../context/NotificationContext";

export type NotificationDetails = { text: string; route: string | null };

/**
 * Checks if the payload matches the expected invitation shape.
 */
export function isInvitationPayload(
  p: Record<string, unknown>,
): p is InvitationPayload {
  return (
    typeof p.invitation_id === "number" && typeof p.invited_by === "string"
  );
}

/**
 * Returns the corresponding user or actor name for the avatar/heading.
 */
export function getNotificationActorName(
  type: NotificationType,
  payload: Record<string, unknown>,
): string {
  if (type === "invitation" && isInvitationPayload(payload)) {
    return payload.invited_by;
  }
  if (typeof payload.actor_name === "string") {
    return payload.actor_name;
  }
  return "System";
}

/**
 * Maps notification types and payloads to human-readable messages and target routes.
 */
export function getNotificationDetails(
  type: NotificationType,
  payload: Record<string, unknown>,
): NotificationDetails {
  const orgName =
    typeof payload.org_name === "string"
      ? payload.org_name
      : "the organization";

  switch (type) {
    case "invitation":
      return {
        text: isInvitationPayload(payload)
          ? `${payload.invited_by} invited you to ${payload.org_name} workspace`
          : "You have a new invitation",
        route: null,
      };
    case "transaction_added":
      return {
        text: `New transaction added: ${payload.description || "Transaction"} (${payload.amount || ""})`,
        route: "/transactions",
      };
    // case "goal_completed":
    //   return {
    //     text: `Spending goal achieved: ${payload.goal_name || "Goal"}`,
    //     route: "/goals", // Upcoming
    //   };
    case "member_removed":
      return {
        text: `A member was removed from ${orgName}`,
        route: "/settings", // Upcoming / Settings
      };
    case "removed_from_org":
      return {
        text: `You were removed from ${orgName}`,
        route: "/settings", // Upcoming / Settings
      };
    // case "organization_deleted":
    //   return {
    //     text: `The organization ${orgName} was deleted`,
    //     route: "/settings", // Upcoming / Settings
    //   };
    default:
      return {
        text: "You have a new notification",
        route: null,
      };
  }
}
