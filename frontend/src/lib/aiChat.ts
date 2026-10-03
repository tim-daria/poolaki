/** @file AI assistant chat: message types and the call to Django's chat proxy.
 * Responses are simulated until Django forwards to ai-service. */

import { firstErrorMessage } from "./apiErrors";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

/**
 * Flip once core/urls.py routes chat to the ai-service. Until then the
 * drawer answers from SIMULATED_REPLIES, so nothing pretends to be a real
 * assistant.
 */
export const CAN_USE_ASSISTANT = false;

/** A 400 whose message belongs in the chat, as opposed to a network failure. */
export class AiChatError extends Error {}

/** Shown when the assistant itself is down (ai-service's 503), not a bad request. */
export const ASSISTANT_UNAVAILABLE =
  "The assistant is unavailable right now. Please try again in a moment.";

/** Canned replies so the UI has something to show before the backend exists. */
const SIMULATED_REPLIES = [
  "I can help with that once I'm connected to your real data — for now this is a placeholder answer.",
  "Good question. Once the assistant is wired up, I'll be able to look at your transactions and goals to answer this.",
  "I don't have live data yet, but here's roughly how I'd approach that once I do.",
];

function simulatedReply(): string {
  return SIMULATED_REPLIES[
    Math.floor(Math.random() * SIMULATED_REPLIES.length)
  ];
}

/**
 * Sends one question and returns the assistant's answer.
 * TODO: swap the body for `POST /api/v1/organizations/${org_id}/chat/` with
 * `{ question }`, expecting `{ answer, metadata: { intent } }`. A 503 from
 * ai-service should surface as ASSISTANT_UNAVAILABLE, a 400 via
 * firstErrorMessage(body).
 */
export async function askAssistant(
  org_id: number,
  question: string,
  csrfToken: string,
): Promise<string> {
  void org_id;
  void question;
  void csrfToken;

  // Simulated network delay, so the "thinking" state is visible in the UI.
  await new Promise((resolve) => setTimeout(resolve, 700));

  return simulatedReply();
}

/** First string found in a DRF error body — reused once the real call lands. */
export function chatErrorMessage(status: number, body: unknown): string {
  if (status === 503) return ASSISTANT_UNAVAILABLE;
  return (
    firstErrorMessage(body) ??
    "Could not reach the assistant. Please try again."
  );
}

/** Generous enough for a real question, small enough to protect the request
 * payload and the LLM's token budget. */
export const MAX_QUESTION_LENGTH = 1000;

/**
 * Validates a question before sending it. Returns an error message or null.
 * Strips control characters (non-printable bytes from paste/autofill) rather
 * than rejecting them outright — a user did not type those on purpose.
 */
export function validateQuestion(raw: string): string | null {
  const question = raw.trim();
  if (!question) return "Ask something first.";
  if (question.length > MAX_QUESTION_LENGTH) {
    return `Keep it under ${MAX_QUESTION_LENGTH} characters.`;
  }
  return null;
}

/** Removes non-printable control characters, keeping newlines and tabs. */
export function sanitizeQuestion(raw: string): string {
  // eslint-disable-next-line no-control-regex -- intentional: strips control chars
  return raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}
