/** @file URL ↔ filters round-trip, including rejection of malformed params. */

import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "../../lib/transactionFilters";
import { parseFilters, serializeFilters } from "./transactionFilterParams";

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe("parseFilters", () => {
  it("returns the defaults for an empty query", () => {
    expect(parse("")).toEqual(DEFAULT_FILTERS);
  });

  it("reads every field", () => {
    expect(
      parse(
        "tab=income&q=rent&sort=oldest&from=2026-01-01&to=2026-01-31&cat=1,3&tax=1&page=2",
      ),
    ).toEqual({
      tab: "income",
      q: "rent",
      sort: "oldest",
      from: "2026-01-01",
      to: "2026-01-31",
      categories: [1, 3],
      taxDeductible: true,
      page: 2,
    });
  });

  it("falls back to defaults for unknown tab and sort values", () => {
    expect(parse("tab=bogus&sort=sideways")).toMatchObject({
      tab: "all",
      sort: "newest",
    });
  });

  it("keeps only positive integer category ids", () => {
    expect(parse("cat=1,x,-2,0,3.5,4").categories).toEqual([1, 4]);
    expect(parse("cat=").categories).toEqual([]);
  });

  it("treats tax as a flag that is only on for '1'", () => {
    expect(parse("tax=1").taxDeductible).toBe(true);
    expect(parse("tax=true").taxDeductible).toBe(false);
    expect(parse("tax=0").taxDeductible).toBe(false);
  });

  it("clamps the page to a positive integer", () => {
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=-3").page).toBe(1);
    expect(parse("page=abc").page).toBe(1);
    expect(parse("page=2.5").page).toBe(1);
    expect(parse("page=7").page).toBe(7);
  });
});

describe("serializeFilters", () => {
  it("omits every default so an untouched page has a clean URL", () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("writes only the fields that differ from the defaults", () => {
    const p = serializeFilters({
      ...DEFAULT_FILTERS,
      tab: "expense",
      categories: [2, 5],
      page: 3,
    });
    expect(p.toString()).toBe("tab=expense&cat=2%2C5&page=3");
  });

  it("round-trips through parseFilters", () => {
    const filters = {
      tab: "contribution" as const,
      q: "café & bar",
      sort: "oldest" as const,
      from: "2026-02-01",
      to: "",
      categories: [7],
      taxDeductible: true,
      page: 2,
    };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });
});
