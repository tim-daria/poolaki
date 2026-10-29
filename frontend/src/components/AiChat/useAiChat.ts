/** @file Conversation state for the AI assistant drawer: messages, sending and error. */

import { useRef, useState } from "react";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { getCsrfToken } from "../../lib/csrf";
import {
  askAssistant,
  prepareQuestion,
  AiChatError,
  type ChatMessage,
} from "../../lib/aiChat";

/** Small unique id for a message key — no server id exists for these yet. */
function messageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useAiChat() {
  const org = useCurrentOrg();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  /** The question in flight, so reset() can abandon it. */
  const inFlight = useRef<AbortController | null>(null);

  function send(raw: string): boolean {
    if (sending) return false;

    const { question, error } = prepareQuestion(raw);
    if (error !== null) {
      setError(error);
      return false;
    }

    setError("");
    setMessages((m) => [
      ...m,
      { id: messageId(), role: "user", content: question },
    ]);
    setSending(true);
    const ac = new AbortController();
    inFlight.current = ac;
    void deliver(question, ac);
    return true;
  }

  async function deliver(question: string, ac: AbortController): Promise<void> {
    try {
      const answer = await askAssistant(
        org.id,
        question,
        getCsrfToken(),
        ac.signal,
      );
      setMessages((m) => [
        ...m,
        { id: messageId(), role: "assistant", content: answer },
      ]);
    } catch (err) {
      // reset() abandoned this question; its conversation is gone.
      if (ac.signal.aborted) return;
      setError(
        err instanceof AiChatError
          ? err.message
          : "Could not reach the assistant. Please try again.",
      );
    } finally {
      // Only the question still current may end the sending state: an
      // abandoned one must not cut short a newer one.
      if (inFlight.current === ac) {
        inFlight.current = null;
        setSending(false);
      }
    }
  }

  /**
   * Clears the conversation when the drawer closes, abandoning a question
   * still in flight so its answer cannot land in the next conversation and
   * "Thinking…" cannot outlive the conversation it belonged to.
   */
  function reset() {
    inFlight.current?.abort();
    inFlight.current = null;
    setSending(false);
    setMessages([]);
    setError("");
  }

  return { messages, sending, error, send, reset };
}
