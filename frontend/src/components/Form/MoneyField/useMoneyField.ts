/**
 * @file Headless amount-field behaviour: filtered typing, whole-string paste,
 * raw text on focus and grouped text on blur. Rules live in lib/money.ts.
 * MoneyField.tsx wraps this for MUI; a plain <input> can spread the same result.
 */

import { useState } from "react";
import {
  DEFAULT_MONEY_LOCALE,
  filterTypedAmount,
  formatAmount,
  parsePastedAmount,
  parseTypedAmount,
  toRawAmount,
  type MoneyLocale,
} from "../../../lib/money";

export type MoneyFieldOptions = {
  /** Canonical amount ("1234.56"), never display text; "" when empty. */
  value: string;
  onChange: (canonical: string) => void;
  locale?: MoneyLocale;
};

export function useMoneyField({
  value,
  onChange,
  locale = DEFAULT_MONEY_LOCALE,
}: MoneyFieldOptions) {
  // Display text is state, not derived from `value`: mid-typing states such as
  // "12." and ".5" canonicalise differently and must not be rewritten under
  // the user's caret.
  const [text, setText] = useState(() => formatAmount(value, locale));
  const [focused, setFocused] = useState(false);

  // Re-sync only when `value` changes externally (re-seeded draft, edit form
  // load). Comparing against the last rendered value, not `text`, ignores
  // echoes of our own onChange.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (!focused) setText(formatAmount(value, locale));
  }

  function emit(next: string) {
    setText(next);
    onChange(parseTypedAmount(next) ?? "");
  }

  return {
    value: text,
    onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
      emit(filterTypedAmount(e.target.value));
    },
    /**
     * Pasted text bypasses the typing filter and is parsed whole; an
     * unparseable paste is ignored, not half-applied. Typed on Element because
     * MUI attaches onPaste to the wrapper div.
     */
    onPaste(e: React.ClipboardEvent<Element>) {
      e.preventDefault();
      const canonical = parsePastedAmount(
        e.clipboardData.getData("text"),
        locale,
      );
      if (canonical === null) return;
      setText(toRawAmount(canonical, locale));
      onChange(canonical);
    },
    onFocus() {
      setFocused(true);
      setText(toRawAmount(value, locale));
    },
    onBlur() {
      setFocused(false);
      setText(formatAmount(value, locale));
    },
    /** Opens the numeric keyboard on phones while keeping "." and "," reachable. */
    inputMode: "decimal" as const,
    autoComplete: "off",
  };
}
