/** @file Unit tests for aiChat.ts's pure logic: no DOM, no network. */

import { describe, expect, it } from "vitest";
import {
  askAssistant,
  chatErrorMessage,
  sanitizeQuestion,
  validateQuestion,
  MAX_QUESTION_LENGTH,
} from "./aiChat";

describe("validateQuestion", () => {
  it("rejects empty or whitespace-only input", () => {
    expect(validateQuestion("   ")).toBe("Ask something first.");
  });

  it("rejects a question over the max length", () => {
    expect(validateQuestion("a".repeat(MAX_QUESTION_LENGTH + 1))).toContain(
      "Keep it under",
    );
  });

  it("accepts a normal question", () => {
    expect(validateQuestion("How much did I spend?")).toBeNull();
  });
});

describe("sanitizeQuestion", () => {
  it("strips control characters but keeps newlines", () => {
    expect(sanitizeQuestion("hi\x00there\nfriend")).toBe("hithere\nfriend");
  });
});

describe("chatErrorMessage", () => {
  it("maps 503 to the assistant-unavailable message", () => {
    expect(chatErrorMessage(503, null)).toMatch(/unavailable/i);
  });

  it("falls back to a generic message when the body has no known shape", () => {
    expect(chatErrorMessage(400, {})).toBe(
      "Could not reach the assistant. Please try again.",
    );
  });
});

describe("askAssistant", () => {
  it("returns one of the simulated replies", async () => {
    const answer = await askAssistant(1, "test question", "token");
    expect(typeof answer).toBe("string");
    expect(answer.length).toBeGreaterThan(0);
  });
});
