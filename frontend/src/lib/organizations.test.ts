/** @file Unit tests for the pure helpers in organizations.ts. */

import { describe, expect, it } from "vitest";
import {
  type Member,
  byRoleThenJoined,
  describeWorkspace,
  leaveOutcome,
  successorOwner,
} from "./organizations";

describe("errorMessageFrom", () => {
  const fallback = "Something went wrong";

  it("takes the first entry of a service errors list", () => {
    expect(errorMessageFrom({ errors: ["a", "b"] }, fallback)).toBe("a");
  });

  it("reads a single error string", () => {
    expect(errorMessageFrom({ error: "x" }, fallback)).toBe("x");
  });

  it("reads the first serializer field error", () => {
    expect(errorMessageFrom({ username: ["taken"] }, fallback)).toBe("taken");
  });

  it("prefers the errors list over a single error", () => {
    expect(
      errorMessageFrom({ errors: ["list"], error: "single" }, fallback),
    ).toBe("list");
  });

  it.each([null, undefined, "nope", {}, { errors: [] }, { error: "" }])(
    "falls back for %j",
    (body) => {
      expect(errorMessageFrom(body, fallback)).toBe(fallback);
    },
  );
});

describe("describeWorkspace", () => {
  it("describes a personal workspace without counts", () => {
    expect(describeWorkspace({ is_personal: true, role: "owner" }, 1, 0)).toBe(
      "Personal · only you",
    );
  });

  it("lists members, invites and ownership for an owner", () => {
    expect(describeWorkspace({ is_personal: false, role: "owner" }, 4, 1)).toBe(
      "4 members · 1 invited · you're the owner",
    );
  });

  it("omits the invite count when there are none", () => {
    expect(
      describeWorkspace({ is_personal: false, role: "member" }, 6, 0),
    ).toBe("6 members · member");
  });

  it("uses the singular for one member", () => {
    expect(describeWorkspace({ is_personal: false, role: "owner" }, 1)).toBe(
      "1 member · you're the owner",
    );
  });

  it("falls back to the role while counts are loading", () => {
    expect(describeWorkspace({ is_personal: false, role: "member" })).toBe(
      "member",
    );
  });
});

const member = (
  username: string,
  role: Member["role"],
  joined_at: string,
  user_id = 0,
) => ({ user_id, username, role, joined_at }) satisfies Member;

describe("byRoleThenJoined", () => {
  it("puts owners first, then orders by join date", () => {
    const sorted = [
      member("late", "member", "2026-06-19T00:00:00Z"),
      member("early", "member", "2026-03-12T00:00:00Z"),
      member("boss", "owner", "2026-08-01T00:00:00Z"),
    ].sort(byRoleThenJoined);
    expect(sorted.map((m) => m.username)).toEqual(["boss", "early", "late"]);
  });
});

describe("leaveOutcome", () => {
  it.each([
    ["owner", 1, "delete"],
    ["owner", 0, "delete"],
    ["owner", 2, "transfer"],
    ["member", 1, "delete"],
    ["member", 3, "leave"],
  ] as const)("%s with %i members → %s", (role, count, expected) => {
    expect(leaveOutcome(role, count)).toBe(expected);
  });
});

describe("successorOwner", () => {
  const me = member("me", "owner", "2026-01-01T00:00:00Z", 1);

  it("picks the longest-standing other member", () => {
    const others = [
      member("late", "member", "2026-06-19T00:00:00Z", 2),
      member("early", "member", "2026-03-12T00:00:00Z", 3),
    ];
    expect(successorOwner([me, ...others], me.user_id)?.username).toBe("early");
  });

  it("breaks a joined_at tie by the smaller user id", () => {
    const others = [
      member("b", "member", "2026-03-12T00:00:00Z", 9),
      member("a", "member", "2026-03-12T00:00:00Z", 4),
    ];
    expect(successorOwner([me, ...others], me.user_id)?.username).toBe("a");
  });

  it("is undefined when nobody else is left", () => {
    expect(successorOwner([me], me.user_id)).toBeUndefined();
  });
});
