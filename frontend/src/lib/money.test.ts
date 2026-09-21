/** @file Amount parsing, formatting and validation rules from docs/frontend/money.md. */

import { describe, expect, it } from "vitest";
import {
  filterTypedAmount,
  formatAmount,
  displayAmount,
  parseMoney,
  parsePastedAmount,
  parseTypedAmount,
  toMoneyString,
  toRawAmount,
  validateAmount,
  validateOpeningBalance,
} from "./money";

describe("wire format", () => {
  it("parseMoney reads the API string and rejects garbage", () => {
    expect(parseMoney("49.90")).toBe(49.9);
    expect(() => parseMoney("abc")).toThrow(/malformed/i);
  });

  it("toMoneyString always carries two decimals", () => {
    expect(toMoneyString(49.9)).toBe("49.90");
    expect(toMoneyString(0)).toBe("0.00");
  });
});

describe("filterTypedAmount", () => {
  it.each([
    ["12.34", "12.34"],
    ["1,5", "1,5"],
    ["12.", "12."],
    [".5", ".5"],
    // Only the first separator survives; later ones are dropped.
    ["12.34.5", "12.34"],
    ["1,2,3", "1,23"],
    // Non-numeric characters are dropped, not rejected.
    ["a1b2c", "12"],
    ["€ 12,50", "12,50"],
    // Decimals cap at two digits.
    ["12.345", "12.34"],
    // Integer digits cap at twelve.
    ["1234567890123", "123456789012"],
    ["1234567890123.45", "123456789012.45"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(filterTypedAmount(input)).toBe(expected);
  });
});

describe("parseTypedAmount", () => {
  it.each([
    ["1234", "1234"],
    ["12.34", "12.34"],
    ["1,5", "1.5"],
    // Partial states are legal mid-typing.
    [".5", "0.5"],
    ["12.", "12"],
    // No digits at all is null, not "0".
    ["", null],
    [".", null],
    [",", null],
  ])("%j → %j", (input, expected) => {
    expect(parseTypedAmount(input)).toBe(expected);
  });
});

describe("parsePastedAmount", () => {
  it("treats mixed separators as grouping plus decimal in either locale", () => {
    expect(parsePastedAmount("1.234,56", "de")).toBe("1234.56");
    expect(parsePastedAmount("1,234.56", "us")).toBe("1234.56");
    // Locale does not matter once both separators are present.
    expect(parsePastedAmount("1.234,56", "us")).toBe("1234.56");
  });

  it("treats repeated uniform separators over 3-digit groups as grouping", () => {
    expect(parsePastedAmount("1.234.567", "de")).toBe("1234567.00");
    expect(parsePastedAmount("1,234,567", "us")).toBe("1234567.00");
  });

  it("resolves a single separator before 3 digits by locale", () => {
    expect(parsePastedAmount("1.234", "de")).toBe("1234.00");
    expect(parsePastedAmount("1.234", "us")).toBe("1.23");
    expect(parsePastedAmount("1,234", "de")).toBe("1.23");
    expect(parsePastedAmount("1,234", "us")).toBe("1234.00");
  });

  it("treats a separator not followed by 3 digits as the decimal", () => {
    expect(parsePastedAmount("12,50", "de")).toBe("12.50");
    expect(parsePastedAmount("12.5", "de")).toBe("12.50");
    expect(parsePastedAmount("12,5", "us")).toBe("12.50");
  });

  it("strips currency symbols and whitespace", () => {
    expect(parsePastedAmount("€ 12,50", "de")).toBe("12.50");
    expect(parsePastedAmount("$1,234.56 USD", "us")).toBe("1234.56");
  });

  it("rounds more than two decimals to cents", () => {
    expect(parsePastedAmount("0,125", "de")).toBe("0.13");
    expect(parsePastedAmount("1.999", "us")).toBe("2.00");
  });

  it("defaults to the German locale", () => {
    expect(parsePastedAmount("1.234")).toBe("1234.00");
  });

  it.each([
    ["-5", "negative"],
    ["abc", "no digits"],
    ["", "empty"],
    ["1.000.000.000.000", "13 integer digits"],
  ])("returns null for %j (%s)", (input) => {
    expect(parsePastedAmount(input, "de")).toBeNull();
  });
});

describe("display", () => {
  it("formatAmount groups and pads per locale", () => {
    expect(formatAmount("1234.5", "de")).toBe("1.234,50");
    expect(formatAmount("1234.5", "us")).toBe("1,234.50");
    expect(formatAmount("0", "de")).toBe("0,00");
  });

  it("formatAmount returns an empty string for empty or invalid input", () => {
    expect(formatAmount("", "de")).toBe("");
    expect(formatAmount("abc", "de")).toBe("");
  });

  it("displayAmount agrees with formatAmount for stored numbers", () => {
    expect(displayAmount(1234.5, "de")).toBe(formatAmount("1234.50", "de"));
  });

  it("toRawAmount swaps the decimal separator without grouping", () => {
    expect(toRawAmount("1234.5", "de")).toBe("1234,5");
    expect(toRawAmount("1234.5", "us")).toBe("1234.5");
  });

  it("toRawAmount keeps a trailing zero cent digit", () => {
    expect(toRawAmount("12.50", "de")).toBe("12,50");
  });

  it("toRawAmount returns an empty string for empty or invalid input", () => {
    expect(toRawAmount("", "de")).toBe("");
    expect(toRawAmount("abc", "de")).toBe("");
  });
});

describe("validation", () => {
  it("rejects empty and non-numeric input", () => {
    expect(validateAmount("")).toBe("Enter an amount");
    expect(validateAmount("   ")).toBe("Enter an amount");
    expect(validateAmount("abc")).toBe("Enter a valid amount");
  });

  it("validateAmount requires at least one cent", () => {
    expect(validateAmount("0")).toBe("Amount must be at least 0,01");
    expect(validateAmount("0.01")).toBeNull();
  });

  it("validateOpeningBalance allows zero but not negatives", () => {
    expect(validateOpeningBalance("0")).toBeNull();
    expect(validateOpeningBalance("-1")).toBe("Amount must be at least 0,00");
  });

  it("rejects amounts over the column limit", () => {
    expect(validateAmount("1000000000000")).toBe(
      "Amount must be at most 999.999.999.999,99",
    );
    expect(validateAmount("999999999999.99")).toBeNull();
  });

  it("formats the bound in the requested locale", () => {
    expect(validateAmount("0", "us")).toBe("Amount must be at least 0.01");
  });
});
