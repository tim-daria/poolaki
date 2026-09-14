/** @file Avatar initial derivation. */

import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("uppercases the first character", () => {
    expect(initials("pavel")).toBe("P");
    expect(initials("  émile")).toBe("É");
  });

  it("keeps a multi-code-unit first character intact", () => {
    expect(initials("😀 user")).toBe("😀");
  });

  it.each([undefined, null, "", "   "])("returns ? for %j", (name) => {
    expect(initials(name)).toBe("?");
  });
});
