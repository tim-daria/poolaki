/** @file Short date formatting. TODAY and the current year are captured at import, so the clock is frozen before each import. */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadWithClock(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
  vi.resetModules();
  return import("./date");
}

describe("date", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.useRealTimers());

  it("TODAY is the ISO date of import time", async () => {
    const { TODAY } = await loadWithClock("2026-03-15T12:00:00Z");
    expect(TODAY).toBe("2026-03-15");
  });

  it("shortDate omits the year inside the current year", async () => {
    const { shortDate } = await loadWithClock("2026-03-15T12:00:00Z");
    expect(shortDate("2026-08-05")).toBe("5 Aug");
  });

  it("shortDate appends the year for other years", async () => {
    const { shortDate } = await loadWithClock("2026-03-15T12:00:00Z");
    expect(shortDate("2025-08-05")).toBe("5 Aug 2025");
    expect(shortDate("2027-01-01")).toBe("1 Jan 2027");
  });

  it("monthHeading names the month, with the year only outside the current one", async () => {
    const { monthHeading } = await loadWithClock("2026-03-15T12:00:00Z");
    expect(monthHeading("2026-07-01")).toBe("July");
    expect(monthHeading("2025-07-01")).toBe("July 2025");
  });

  it("longDate is weekday, day and month, in English whatever the browser says", async () => {
    const { longDate } = await loadWithClock("2026-03-15T12:00:00Z");
    expect(longDate(new Date("2026-10-17T12:00:00"))).toBe(
      "Saturday 17 October",
    );
  });

  it("monthName is the long English month", async () => {
    const { monthName } = await loadWithClock("2026-03-15T12:00:00Z");
    expect(monthName("2026-08-31")).toBe("August");
  });

  it("monthBounds spans the first to the last day, whatever the month's length", async () => {
    const { monthBounds } = await loadWithClock("2026-03-15T12:00:00Z");
    expect(monthBounds("2026-10-18")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(monthBounds("2028-02-10")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
    expect(monthBounds("2026-12-31")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });
});
