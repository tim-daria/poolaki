/** @file Unit tests for aiChat.ts's pure logic: no DOM, no network. */

import { describe, expect, it } from "vitest";
import {
  askAssistant,
  chatErrorMessage,
  prepareQuestion,
  MAX_QUESTION_LENGTH,
} from "./aiChat";

describe("prepareQuestion", () => {
  it("rejects empty or whitespace-only input", () => {
    expect(prepareQuestion("   ")).toEqual({
      question: null,
      error: "Ask something first.",
    });
  });

  it("rejects a question over the max length", () => {
    expect(
      prepareQuestion("a".repeat(MAX_QUESTION_LENGTH + 1)).error,
    ).toContain("Keep it under");
  });

  it("strips control characters, keeps newlines and trims", () => {
    expect(prepareQuestion("hi\x00there\nfriend ")).toEqual({
      question: "hithere\nfriend",
      error: null,
    });
  });

  it("accepts a normal question", () => {
    expect(prepareQuestion("How much did I spend?")).toEqual({
      question: "How much did I spend?",
      error: null,
    });
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
