/** @file Unit tests for aiChat.ts: question validation and the chat API call. */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  askAssistant,
  chatErrorMessage,
  prepareQuestion,
  AiChatError,
  ASSISTANT_UNAVAILABLE,
  TOO_MANY_REQUESTS,
  INVALID_QUESTION,
  ACCESS_DENIED,
  MAX_QUESTION_LENGTH,
} from "./aiChat";

const jsonResponse = (status: number, payload: unknown): Response =>
  new Response(JSON.stringify(payload), { status });

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
    expect(chatErrorMessage(503, null)).toBe(ASSISTANT_UNAVAILABLE);
  });

  it("uses a fixed wait message on 429, ignoring the body", () => {
    expect(
      chatErrorMessage(429, {
        detail: "Request was throttled. Expected available in 12 seconds.",
      }),
    ).toBe(TOO_MANY_REQUESTS);
  });

  it("uses a fixed message on 400, ignoring the body", () => {
    expect(
      chatErrorMessage(400, { errors: ["This field may not be blank."] }),
    ).toBe(INVALID_QUESTION);
  });

  it("uses a fixed access message on 403, ignoring the DRF body", () => {
    expect(
      chatErrorMessage(403, {
        detail: "Authentication credentials were not provided.",
      }),
    ).toBe(ACCESS_DENIED);
  });

  it("falls back to a generic message for unexpected statuses with no known body shape", () => {
    // 500 here means an unhandled server error; our mapped errors never reach the chat path as 500.
    expect(chatErrorMessage(500, {})).toBe(
      "Could not reach the assistant. Please try again.",
    );
  });
});

describe("askAssistant", () => {
  afterEach(() => vi.restoreAllMocks());

  it("posts the question to the org chat endpoint and returns the answer", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, {
        answer: "You spent 500 on Food this month.",
        metadata: { intent: "monthly_summary" },
      }),
    );

    const answer = await askAssistant(
      7,
      "How much did I spend this month?",
      "csrf-1",
    );

    expect(answer).toBe("You spent 500 on Food this month.");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/organizations/7/chat/",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ question: "How much did I spend this month?" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-CSRFToken": "csrf-1",
        }),
      }),
    );
  });

  it("throws AiChatError with the unavailable message on 503", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(503, { errors: [ASSISTANT_UNAVAILABLE] }),
    );
    const promise = askAssistant(1, "q", "t");
    await expect(promise).rejects.toBeInstanceOf(AiChatError);
    await expect(promise).rejects.toThrow(ASSISTANT_UNAVAILABLE);
  });

  it("throws AiChatError with the wait message on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(429, {
        detail: "Request was throttled. Expected available in 12 seconds.",
      }),
    );
    const promise = askAssistant(1, "q", "t");
    await expect(promise).rejects.toBeInstanceOf(AiChatError);
    await expect(promise).rejects.toThrow(TOO_MANY_REQUESTS);
  });

  it("throws AiChatError with the fixed message on 400", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(400, { errors: ["This field may not be blank."] }),
    );
    const promise = askAssistant(1, "q", "t");
    await expect(promise).rejects.toBeInstanceOf(AiChatError);
    await expect(promise).rejects.toThrow(INVALID_QUESTION);
  });

  it("throws AiChatError with the access message on 403", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(403, {
        detail: "You are not a member of this organization.",
      }),
    );
    const promise = askAssistant(1, "q", "t");
    await expect(promise).rejects.toBeInstanceOf(AiChatError);
    await expect(promise).rejects.toThrow(ACCESS_DENIED);
  });

  it("treats a 200 without a usable answer as unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, {}));
    const promise = askAssistant(1, "q", "t");
    await expect(promise).rejects.toBeInstanceOf(AiChatError);
    await expect(promise).rejects.toThrow(ASSISTANT_UNAVAILABLE);
  });

  it("throws a plain Error when the network call fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("fetch failed"),
    );
    const promise = askAssistant(1, "q", "t");
    await expect(promise).rejects.toThrow(
      "Could not reach the assistant. Please try again.",
    );
    await expect(promise).rejects.not.toBeInstanceOf(AiChatError);
  });
});
