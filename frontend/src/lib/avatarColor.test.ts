/** @file Avatar colour selection must be stable and always land inside the palette. */

import { describe, expect, it } from "vitest";
import { avatarColor } from "./avatarColor";

const PALETTE = ["#a", "#b", "#c", "#d", "#e"] as const;

describe("avatarColor", () => {
  it("is deterministic for the same name", () => {
    expect(avatarColor("pavel", PALETTE)).toBe(avatarColor("pavel", PALETTE));
  });

  it("ignores surrounding whitespace", () => {
    expect(avatarColor("  pavel ", PALETTE)).toBe(
      avatarColor("pavel", PALETTE),
    );
  });

  it("always picks a palette entry", () => {
    for (const name of [
      "a",
      "bb",
      "ccc",
      "zürich",
      "😀",
      "very long user name",
    ]) {
      expect(PALETTE).toContain(avatarColor(name, PALETTE));
    }
  });

  it("falls back to the first entry for a missing name", () => {
    expect(avatarColor(undefined, PALETTE)).toBe(PALETTE[0]);
    expect(avatarColor(null, PALETTE)).toBe(PALETTE[0]);
    expect(avatarColor("   ", PALETTE)).toBe(PALETTE[0]);
  });

  it("spreads different names across the palette", () => {
    const picks = new Set(
      ["alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi"].map(
        (n) => avatarColor(n, PALETTE),
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
