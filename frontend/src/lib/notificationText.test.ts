/** @file Unit tests for notification row copy and attribution. */

import { describe, expect, it } from "vitest";
import {
  actorName,
  isInvitationPayload,
  isMemberLeftPayload,
  isMemberRemovedPayload,
  isOrganizationDeletedPayload,
  isOwnerChangedPayload,
  isOwnershipTransferredPayload,
  isRemovedFromOrgPayload,
  typeText,
} from "./notificationText";

const invitation = {
  invitation_id: 7,
  org_id: 3,
  org_name: "Trip",
  invited_by: "bob",
};
const memberRemoved = {
  org_name: "Trip",
  removed_user: "alice",
  removed_by: "bob",
};
const removedFromOrg = { org_name: "Trip", removed_by: "bob" };
const memberLeft = { user: "carol", org_name: "Trip" };
const ownershipTransferred = { previous_owner: "bob", org_name: "Trip" };
const ownerChanged = { ...ownershipTransferred, new_owner: "dana" };
const organizationDeleted = { org_name: "Trip", last_member: "bob" };

describe("isInvitationPayload", () => {
  it("accepts the invitation payload", () => {
    expect(isInvitationPayload(invitation)).toBe(true);
  });

  it("rejects a payload without an invitation id", () => {
    expect(isInvitationPayload(removedFromOrg)).toBe(false);
  });
});

describe("isMemberRemovedPayload", () => {
  it("accepts the full payload", () => {
    expect(isMemberRemovedPayload(memberRemoved)).toBe(true);
  });

  it("rejects the removed-from-org payload, which lacks removed_user", () => {
    expect(isMemberRemovedPayload(removedFromOrg)).toBe(false);
  });

  it("rejects non-string fields", () => {
    expect(isMemberRemovedPayload({ ...memberRemoved, removed_by: 1 })).toBe(
      false,
    );
  });
});

describe("isRemovedFromOrgPayload", () => {
  it("accepts the payload", () => {
    expect(isRemovedFromOrgPayload(removedFromOrg)).toBe(true);
  });

  it("rejects a payload missing the actor", () => {
    expect(isRemovedFromOrgPayload({ org_name: "Trip" })).toBe(false);
  });
});

describe("leave-related payload guards", () => {
  it("accept their own payloads", () => {
    expect(isMemberLeftPayload(memberLeft)).toBe(true);
    expect(isOwnershipTransferredPayload(ownershipTransferred)).toBe(true);
    expect(isOwnerChangedPayload(ownerChanged)).toBe(true);
    expect(isOrganizationDeletedPayload(organizationDeleted)).toBe(true);
  });

  it("owner_changed rejects the transferred payload, which lacks new_owner", () => {
    expect(isOwnerChangedPayload(ownershipTransferred)).toBe(false);
  });

  it("transferred accepts the richer owner_changed payload", () => {
    expect(isOwnershipTransferredPayload(ownerChanged)).toBe(true);
  });

  it("reject payloads missing the actor", () => {
    expect(isMemberLeftPayload({ org_name: "Trip" })).toBe(false);
    expect(isOrganizationDeletedPayload({ org_name: "Trip" })).toBe(false);
  });
});

describe("typeText", () => {
  it.each([
    ["invitation", invitation, "bob invited you to Trip workspace"],
    ["invitation", {}, "You have a new invitation"],
    ["transaction_added", {}, "A new transaction was added"],
    ["goal_completed", {}, "A spending goal has been achieved"],
    ["member_left", memberLeft, "carol left Trip"],
    ["member_left", {}, "A member left the workspace"],
    ["member_removed", memberRemoved, "bob removed alice from Trip"],
    ["member_removed", {}, "A member was removed from a workspace"],
    ["removed_from_org", removedFromOrg, "bob removed you from Trip"],
    ["removed_from_org", {}, "You were removed from a workspace"],
    [
      "ownership_transferred",
      ownershipTransferred,
      "bob left Trip — you're now the owner",
    ],
    ["ownership_transferred", {}, "You're now the owner of a workspace"],
    ["owner_changed", ownerChanged, "bob left Trip — dana is now the owner"],
    ["owner_changed", {}, "A workspace has a new owner"],
    [
      "organization_deleted",
      organizationDeleted,
      "Trip was deleted after bob left, so your invitation no longer stands",
    ],
    ["organization_deleted", {}, "A workspace you were invited to was deleted"],
    ["something_new", {}, "Notification"],
  ])("renders %s", (type, payload, expected) => {
    expect(typeText(type, payload)).toBe(expected);
  });
});

describe("actorName", () => {
  it("attributes an invitation to the inviter", () => {
    expect(actorName("invitation", invitation)).toBe("bob");
  });

  it("attributes removals to whoever removed", () => {
    expect(actorName("member_removed", memberRemoved)).toBe("bob");
    expect(actorName("removed_from_org", removedFromOrg)).toBe("bob");
  });

  it("attributes leaving to whoever left", () => {
    expect(actorName("member_left", memberLeft)).toBe("carol");
    expect(actorName("ownership_transferred", ownershipTransferred)).toBe(
      "bob",
    );
    expect(actorName("owner_changed", ownerChanged)).toBe("bob");
    expect(actorName("organization_deleted", organizationDeleted)).toBe("bob");
  });

  it("falls back to a generic actor", () => {
    expect(actorName("member_removed", {})).toBe("User");
    expect(actorName("member_left", {})).toBe("User");
    expect(actorName("goal_completed", {})).toBe("User");
  });
});
