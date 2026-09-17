/**
 * @file Headless text-field behaviour that keeps a value in one casing.
 * Rules live in lib/text.ts; TextInput.tsx wraps this for MUI.
 */

import { formatName, formatUsername } from "../../lib/text";

/**
 * - `name`: "Example". A workspace name, a goal name, a description.
 * - `username`: "example". A username or an email.
 */
export type TextCasing = "name" | "username";

/** The form holds the value; this only decides when to rewrite it. */
export function useTextInput({
  value,
  onChange,
  casing,
}: {
  value: string;
  onChange: (value: string) => void;
  casing: TextCasing;
}) {
  /** Emits only a real change, so tabbing through a field does not arm a Save button. */
  function emit(next: string) {
    if (next !== value) onChange(next);
  }

  return {
    value,

    onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
      const typed = e.target.value;
      // Lowercasing is safe mid-typing; capitalising is not, since trimming
      // mid-word would swallow the space in "Winter tyres". `name` waits for blur.
      onChange(casing === "username" ? typed.toLowerCase() : typed);
    },

    onBlur() {
      emit(casing === "username" ? formatUsername(value) : formatName(value));
    },

    // An identifier is not a sentence: auto-capitalise and spellcheck are
    // both wrong about it.
    ...(casing === "username"
      ? { autoCapitalize: "none" as const, spellCheck: false }
      : {}),
  };
}
