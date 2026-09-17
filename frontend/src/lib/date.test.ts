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
});
