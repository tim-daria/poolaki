/** @file Unit tests for the pure helpers in organizations.ts. */

import { describe, expect, it } from "vitest";
import {
  type Member,
  byRoleThenJoined,
  describeWorkspace,
  errorMessageFrom,
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

describe("byRoleThenJoined", () => {
  const member = (username: string, role: Member["role"], joined_at: string) =>
    ({ user_id: 0, username, role, joined_at }) satisfies Member;

  it("puts owners first, then orders by join date", () => {
    const sorted = [
      member("late", "member", "2026-06-19T00:00:00Z"),
      member("early", "member", "2026-03-12T00:00:00Z"),
      member("boss", "owner", "2026-08-01T00:00:00Z"),
    ].sort(byRoleThenJoined);
    expect(sorted.map((m) => m.username)).toEqual(["boss", "early", "late"]);
  });
});
