/** @file Conversation state for the AI assistant drawer: messages, sending and error. */

import { useState } from "react";
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
    void deliver(question);
    return true;
  }

  async function deliver(question: string): Promise<void> {
    try {
      const answer = await askAssistant(org.id, question, getCsrfToken());
      setMessages((m) => [
        ...m,
        { id: messageId(), role: "assistant", content: answer },
      ]);
    } catch (err) {
      setError(
        err instanceof AiChatError
          ? err.message
          : "Could not reach the assistant. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  /** Clears the conversation when the drawer closes. */
  function reset() {
    setMessages([]);
    setError("");
  }

  return { messages, sending, error, send, reset };
}
