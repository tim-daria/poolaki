/** @file API fetcher tests for the yearly financial report. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchYearlyReport, type YearlyReportResponse } from "./reports";

function stubFetch(body: unknown, status = 200) {
  const fn = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ORG = 1;

/** Sample response shape matching the DRF ReportResponseSerializer. */
const MOCK_REPORT: YearlyReportResponse = {
  year: 2026,
  totals: {
    income: "1000.00",
    expense: "4110.00",
    goals_balance: "241.00",
  },
  monthly: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: i === 5 ? "1000.00" : "0.00",
    expense:
      i === 0 ? "888.00" : i === 8 ? "2222.00" : i === 9 ? "1000.00" : "0.00",
    goals_balance: i === 9 ? "241.00" : "0.00",
  })),
  categories: [
    {
      category_id: 8,
      name: "Salary",
      type: "income",
      total: "1000.00",
      monthly: [
        "0.00",
        "0.00",
        "0.00",
        "0.00",
        "0.00",
        "1000.00",
        "0.00",
        "0.00",
        "0.00",
        "0.00",
        "0.00",
        "0.00",
      ],
    },
  ],
  goal_balance: "1540.50",
  goals: [
    {
      goal_id: 15,
      name: "Travel",
      status: "active",
      target_amount: "222.00",
      balance: "241.00",
      monthly: Array.from({ length: 12 }, (_, i) =>
        i === 9 ? "241.00" : "0.00",
      ),
    },
  ],
};

describe("fetchYearlyReport", () => {
  it("requests the correct URL with session credentials included", async () => {
    const fetch = stubFetch(MOCK_REPORT);
    await fetchYearlyReport(ORG, 2026);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/v1/organizations/1/reports/?year=2026");
    expect(init.credentials).toBe("include");
  });

  it("passes through the AbortSignal when provided", async () => {
    const fetch = stubFetch(MOCK_REPORT);
    const controller = new AbortController();
    await fetchYearlyReport(ORG, 2026, controller.signal);

    const [, init] = fetch.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });

  it("returns the yearly report payload from the server", async () => {
    stubFetch(MOCK_REPORT);
    const result = await fetchYearlyReport(ORG, 2026);
    expect(result).toEqual(MOCK_REPORT);
  });

  it("rejects with the status on a failed request", async () => {
    stubFetch({}, 500);
    await expect(fetchYearlyReport(ORG, 2026)).rejects.toThrow(
      "Failed to load yearly report (500)",
    );
  });
});
