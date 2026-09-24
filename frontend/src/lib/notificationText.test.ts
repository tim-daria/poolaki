/** @file Unit tests for notification row copy and attribution. */

import { describe, expect, it } from "vitest";
import {
  actorName,
  isInvitationPayload,
  isMemberRemovedPayload,
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

describe("typeText", () => {
  it.each([
    ["invitation", invitation, "bob invited you to Trip workspace"],
    ["invitation", {}, "You have a new invitation"],
    ["transaction_added", {}, "A new transaction was added"],
    ["goal_completed", {}, "A spending goal has been achieved"],
    ["member_left", {}, "A member left the workspace"],
    ["member_removed", memberRemoved, "bob removed alice from Trip"],
    ["member_removed", {}, "A member was removed from a workspace"],
    ["removed_from_org", removedFromOrg, "bob removed you from Trip"],
    ["removed_from_org", {}, "You were removed from a workspace"],
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

  it("falls back to a generic actor", () => {
    expect(actorName("member_removed", {})).toBe("User");
    expect(actorName("goal_completed", {})).toBe("User");
  });
});
