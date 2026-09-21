/** @file Status and code → message mapping for the login and sign-up forms. */

import { describe, expect, it } from "vitest";
import { authErrorMessage, redirectErrorMessage } from "./authErrors";

const FALLBACK = "Login failed.";

describe("authErrorMessage", () => {
  it.each([500, 502, 503, 504])(
    "returns the server message for %i, ignoring any errors array",
    (status) => {
      const msg = authErrorMessage(
        status,
        [{ code: "invalid_credentials", message: "x" }],
        FALLBACK,
      );
      expect(msg).toMatch(/our end/i);
      expect(msg).not.toMatch(/credentials/i);
    },
  );

  it("returns one rate-limit message for any 429", () => {
    expect(authErrorMessage(429, undefined, FALLBACK)).toBe(
      "Too many attempts. Please try again later.",
    );
  });

  it("maps a known allauth code to its override", () => {
    expect(
      authErrorMessage(
        400,
        [{ code: "email_taken", message: "server text" }],
        FALLBACK,
      ),
    ).toBe("This email is already in use.");
  });

  it("passes through the server message for an unknown code", () => {
    expect(
      authErrorMessage(
        400,
        [{ code: "brand_new_code", message: "server text" }],
        FALLBACK,
      ),
    ).toBe("server text");
  });

  it("uses the server message when the error carries no code", () => {
    expect(authErrorMessage(401, [{ message: "no code" }], FALLBACK)).toBe(
      "no code",
    );
  });

  it("only surfaces the first error", () => {
    expect(
      authErrorMessage(
        400,
        [
          { code: "username_taken", message: "a" },
          { code: "email_taken", message: "b" },
        ],
        FALLBACK,
      ),
    ).toBe("This username is already taken.");
  });

  it.each([undefined, []])("falls back when errors are %s", (errors) => {
    expect(authErrorMessage(401, errors, FALLBACK)).toBe(FALLBACK);
  });
});

describe("redirectErrorMessage", () => {
  it("returns an empty string for a missing code", () => {
    expect(redirectErrorMessage(null)).toBe("");
    expect(redirectErrorMessage("")).toBe("");
  });

  it("maps known codes", () => {
    expect(redirectErrorMessage("account_not_found")).toMatch(/sign up first/i);
    expect(redirectErrorMessage("oauth-failed")).toMatch(/did not complete/i);
    expect(redirectErrorMessage("access_denied")).toMatch(/cancelled/i);
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(redirectErrorMessage("some_provider_code")).toMatch(
      /signing in with 42 failed/i,
    );
  });
});
