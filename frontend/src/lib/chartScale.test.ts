import { describe, expect, it } from "vitest";
import { monthOpacity, niceMax } from "./chartScale";

describe("niceMax", () => {
  it("returns 1 for zero or negative values", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-5)).toBe(1);
  });

  it("rounds up to 1, 2, 5 or 10 times a power of ten", () => {
    expect(niceMax(1.2)).toBe(2);
    expect(niceMax(3200)).toBe(5000);
    expect(niceMax(5001)).toBe(10000);
  });

  it("keeps exact nice values unchanged", () => {
    expect(niceMax(5000)).toBe(5000);
  });
});

describe("monthOpacity", () => {
  it("shows every month fully for past years", () => {
    expect(monthOpacity(3, null)).toBe(1);
  });

  it("highlights the current month, dims past ones and hides future ones", () => {
    expect(monthOpacity(9, 9)).toBe(1);
    expect(monthOpacity(4, 9)).toBe(0.35);
    expect(monthOpacity(11, 9)).toBe(0);
  });
});
