/** @file Name and username normalisation, and name truncation for toasts. */

import { describe, expect, it } from "vitest";
import {
  MAX_TOAST_NAME_LENGTH,
  formatName,
  formatUsername,
  truncateName,
} from "./text";

describe("formatName", () => {
  it("collapses internal whitespace and trims", () => {
    expect(formatName("  Weekly   shop \n")).toBe("Weekly shop");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(formatName("   ")).toBe("");
  });
});

describe("formatUsername", () => {
  it("trims and lowercases without collapsing inner whitespace", () => {
    expect(formatUsername("  Pavel ")).toBe("pavel");
    expect(formatUsername("A B")).toBe("a b");
  });
});

describe("truncateName", () => {
  it("returns a name at the limit unchanged", () => {
    const name = "a".repeat(MAX_TOAST_NAME_LENGTH);
    expect(truncateName(name)).toBe(name);
  });

  it("cuts a longer name to the limit, ending in an ellipsis", () => {
    const result = truncateName("a".repeat(MAX_TOAST_NAME_LENGTH + 1));
    expect(result).toBe(`${"a".repeat(MAX_TOAST_NAME_LENGTH - 3)}...`);
  });

  it("respects a custom limit", () => {
    expect(truncateName("abcdef", 5)).toBe("ab...");
  });
});
