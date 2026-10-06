/** @file Error-body shapes firstProblem and firstErrorMessage must read. */

import { describe, expect, it } from "vitest";
import {
  firstErrorMessage,
  firstProblem,
  isRejection,
  rejectionMessage,
} from "./apiErrors";

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

describe("isRejection", () => {
  it("is true only for 400 and 403", () => {
    expect(isRejection(new Response(null, { status: 400 }))).toBe(true);
    expect(isRejection(new Response(null, { status: 403 }))).toBe(true);
    expect(isRejection(new Response(null, { status: 404 }))).toBe(false);
    expect(isRejection(new Response(null, { status: 500 }))).toBe(false);
  });
});

describe("rejectionMessage", () => {
  const fallback = "Could not do it";
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status });

  it("reads a service message from a 400", async () => {
    await expect(
      rejectionMessage(json({ errors: ["Workspace is full."] }, 400), fallback),
    ).resolves.toBe("Workspace is full.");
  });

  it("reads a DRF permission message from a 403", async () => {
    await expect(
      rejectionMessage(json({ detail: "Not the owner." }, 403), fallback),
    ).resolves.toBe("Not the owner.");
  });

  it("falls back when the body is not JSON", async () => {
    await expect(
      rejectionMessage(new Response("<html>", { status: 400 }), fallback),
    ).resolves.toBe(fallback);
  });

  it("falls back when the body carries no message", async () => {
    await expect(
      rejectionMessage(json({ errors: [] }, 400), fallback),
    ).resolves.toBe(fallback);
  });
});
