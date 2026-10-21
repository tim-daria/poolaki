import { describe, expect, it } from "vitest";
import { yearOptions } from "./reportYears";

const CURRENT = 2026;

describe("yearOptions", () => {
  it("offers only the current year when the earliest is unknown", () => {
    expect(yearOptions(null, CURRENT)).toEqual([CURRENT]);
  });

  it("ignores an earliest year after the current one", () => {
    expect(yearOptions(CURRENT + 1, CURRENT)).toEqual([CURRENT]);
  });

  it("lists every year from the current back to the earliest", () => {
    expect(yearOptions(2024, CURRENT)).toEqual([2026, 2025, 2024]);
  });
});
