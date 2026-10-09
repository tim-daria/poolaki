/** @file AI assistant chat: message types and the call to Django's chat proxy.
 * Django validates and rate-limits, then forwards the question to ai-service. */

import { firstErrorMessage } from "./apiErrors";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

/** HTTP failure with a user-facing message, as opposed to a network failure. */
export class AiChatError extends Error {}

/** Shown when the assistant itself is down (ai-service's 503), not a bad request. */
export const ASSISTANT_UNAVAILABLE =
  "The assistant is unavailable right now. Please try again in a moment.";

/** Fixed 429 copy; DRF's throttle detail is server-side wording. */
export const TOO_MANY_REQUESTS =
  "You are asking the assistant too fast. Wait a moment and try again.";

/** Fixed 400 copy; Django's field wording ("This field may not be blank.")
 * is meaningless in a chat bubble, and the client pre-checks the same rules. */
export const INVALID_QUESTION =
  "Your question could not be processed. Please check it and try again.";

/**
 * POST /api/v1/organizations/${org_id}/chat/ with { question }; expects
 * { answer, metadata: { intent } }. intent is dropped: the drawer shows text.
 *
 * A network failure throws a plain Error; any HTTP failure throws AiChatError
 * so useAiChat renders the message inside the conversation instead.
 */
export async function askAssistant(
  org_id: number,
  question: string,
  csrfToken: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`/api/v1/organizations/${org_id}/chat/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new Error("Could not reach the assistant. Please try again.");
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new AiChatError(chatErrorMessage(res.status, body));

  const answer =
    body && typeof body === "object"
      ? (body as { answer?: unknown }).answer
      : undefined;
  if (typeof answer !== "string" || !answer)
    throw new AiChatError(ASSISTANT_UNAVAILABLE);
  return answer;
}

/** Maps a failed chat response to a user-facing message. */
export function chatErrorMessage(status: number, body: unknown): string {
  if (status === 503) return ASSISTANT_UNAVAILABLE;
  // 429 deliberately ignores the body: DRF's default "Request was throttled."
  // detail is server-side wording, not user copy.
  if (status === 429) return TOO_MANY_REQUESTS;
  if (status === 400) return INVALID_QUESTION;
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

export type PreparedQuestion =
  { question: string; error: null } | { question: null; error: string };

export function prepareQuestion(raw: string): PreparedQuestion {
  const question = sanitizeQuestion(raw).trim();
  if (!question) return { question: null, error: "Ask something first." };
  if (question.length > MAX_QUESTION_LENGTH)
    return {
      question: null,
      error: `Keep it under ${MAX_QUESTION_LENGTH} characters.`,
    };
  return { question, error: null };
}

/** Removes non-printable control characters, keeping newlines and tabs. */
function sanitizeQuestion(raw: string): string {
  // eslint-disable-next-line no-control-regex -- intentional: strips control chars
  return raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}
