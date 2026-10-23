import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { isoFromPicker, pickerHint } from "./isoFromPicker";

describe("isoFromPicker", () => {
  it("reports a valid, unflagged date as ISO", () => {
    expect(isoFromPicker(dayjs("2026-08-31"), null)).toBe("2026-08-31");
  });

  it("reports a date outside an opted-in bound as empty", () => {
    expect(isoFromPicker(dayjs("2099-01-01"), "disableFuture")).toBe("");
    expect(isoFromPicker(dayjs("2000-01-01"), "disablePast")).toBe("");
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

describe("pickerHint", () => {
  it("names the two opted-in bounds and nothing else", () => {
    expect(pickerHint("disableFuture")).toBe("Cannot be in the future.");
    expect(pickerHint("disablePast")).toBe("Cannot be in the past.");
    expect(pickerHint("minDate")).toBeUndefined();
    expect(pickerHint(null)).toBeUndefined();
  });
});
