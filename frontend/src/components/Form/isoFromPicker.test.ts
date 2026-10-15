import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { isoFromPicker } from "./isoFromPicker";

describe("isoFromPicker", () => {
  it("reports a valid, unflagged date as ISO", () => {
    expect(isoFromPicker(dayjs("2026-08-31"), null)).toBe("2026-08-31");
  });

  it("reports a date the picker flags as empty, even though dayjs accepts it", () => {
    const partialYear = dayjs("0202-08-31");
    expect(partialYear.isValid()).toBe(true);
    expect(isoFromPicker(partialYear, "minDate")).toBe("");
  });

  it("reports an empty field as empty", () => {
    expect(isoFromPicker(null, null)).toBe("");
  });

  it("reports an unparseable date as empty", () => {
    expect(isoFromPicker(dayjs("not a date"), "invalidDate")).toBe("");
  });
});
