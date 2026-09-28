/** @file Error-body shapes firstProblem and firstErrorMessage must read. */

import { describe, expect, it } from "vitest";
import { firstErrorMessage, firstProblem } from "./apiErrors";

describe("firstProblem", () => {
  it("returns null for bodies with no message", () => {
    for (const body of [
      null,
      undefined,
      {},
      [],
      { amount: [] },
      "",
      { errors: [] },
      42,
    ]) {
      expect(firstProblem(body)).toBeNull();
    }
  });

  it("reads a service body as a field-less message", () => {
    expect(firstProblem({ errors: ["Org is full."] })).toEqual({
      field: "",
      message: "Org is full.",
    });
    expect(firstProblem({ errors: ["First.", "Second."] })?.message).toBe(
      "First.",
    );
  });

  it("reads the DRF non-field shapes as field-less", () => {
    expect(firstProblem({ detail: "Not found." })).toEqual({
      field: "",
      message: "Not found.",
    });
    expect(firstProblem({ non_field_errors: ["Nope"] })).toEqual({
      field: "",
      message: "Nope",
    });
    expect(firstProblem(["Bare"])).toEqual({ field: "", message: "Bare" });
  });

  it("names the field for a DRF field error", () => {
    expect(firstProblem({ username: ["No such user."] })).toEqual({
      field: "username",
      message: "No such user.",
    });
  });

  it("does not treat the retired `error` key as non-field", () => {
    expect(firstProblem({ error: "Legacy" })).toEqual({
      field: "error",
      message: "Legacy",
    });
  });

  it("surfaces the first problem in key order", () => {
    expect(firstProblem({ amount: ["A"], description: ["B"] })?.field).toBe(
      "amount",
    );
  });

  it("skips blank list entries", () => {
    expect(firstProblem({ errors: ["", "Real"] })?.message).toBe("Real");
    expect(firstProblem(["", null, "Bare"])?.message).toBe("Bare");
    expect(firstProblem({ errors: ["", ""] })).toBeNull();
  });

  it("reports the innermost key for a nested field error", () => {
    expect(firstProblem({ profile: { name: ["Required"] } })).toEqual({
      field: "name",
      message: "Required",
    });
  });

  it("walks into objects nested under errors", () => {
    expect(firstProblem({ errors: [{ username: ["Taken"] }] })).toEqual({
      field: "username",
      message: "Taken",
    });
  });
});

describe("firstErrorMessage", () => {
  it("returns only the message", () => {
    expect(firstErrorMessage({ errors: ["X"] })).toBe("X");
    expect(firstErrorMessage({ username: ["Y"] })).toBe("Y");
  });

  it("returns null when there is none", () => {
    for (const body of [null, {}, { errors: [] }]) {
      expect(firstErrorMessage(body)).toBeNull();
    }
  });
});
