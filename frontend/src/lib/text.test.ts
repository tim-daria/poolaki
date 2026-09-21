/** @file Name and username normalisation. */

import { describe, expect, it } from "vitest";
import { formatName, formatUsername } from "./text";

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
