/**
 * @file Money as text: wire format, typed and pasted input parsing, display
 * formatting and amount validation. React-free; the input behaviour lives in
 * components/Form/useMoneyField.ts. Rules are documented in docs/frontend/money.md.
 */

/** Parses the API's fixed-precision string; throws on malformed input. */
export function parseMoney(wire: string): number {
  const n = Number(wire);
  if (Number.isNaN(n)) throw new Error(`Malformed amount from API: ${wire}`);
  return n;
}

/** Serialises for the API as a two-decimal string, never a float. */
export function toMoneyString(n: number): string {
  return n.toFixed(2);
}

/* ---------------------------------- */
/*               Limits               */
/* ---------------------------------- */

/**
 * Amount columns store 14 digits including 2 decimals, so 12 integer digits.
 * Enforced client-side so overflow is refused while typing, not at submit.
 */
export const MAX_INT_DIGITS = 12;
export const DECIMAL_PLACES = 2;
export const MAX_AMOUNT = 999999999999.99;
export const MIN_AMOUNT = 0.01;

/* ---------------------------------- */
/*               Locale               */
/* ---------------------------------- */

/** German is the default; nothing currently passes "us". */
export type MoneyLocale = "de" | "us";
export const DEFAULT_MONEY_LOCALE: MoneyLocale = "de";

const SEPARATORS: Record<MoneyLocale, { group: string; decimal: string }> = {
  de: { group: ".", decimal: "," },
  us: { group: ",", decimal: "." },
};

/** BCP 47 tags for Intl.NumberFormat. */
const INTL_LOCALE: Record<MoneyLocale, string> = {
  de: "de-DE",
  us: "en-US",
};

/* ---------------------------------- */
/*            Typed input             */
/* ---------------------------------- */

/**
 * Filters typed text to digits, at most one separator ("." or ","), at most
 * MAX_INT_DIGITS before it and DECIMAL_PLACES after it. Offending characters
 * are dropped, not rejected. The first separator is always the decimal one:
 * hand-typed amounts carry no grouping. Partial values ("12.", ".5") are
 * allowed and completed on blur.
 */
export function filterTypedAmount(candidate: string): string {
  let out = "";
  let intDigits = 0;
  let decDigits = 0;
  let seenSeparator = false;

  for (const ch of candidate) {
    if (ch >= "0" && ch <= "9") {
      if (seenSeparator) {
        if (decDigits === DECIMAL_PLACES) continue;
        decDigits++;
      } else {
        if (intDigits === MAX_INT_DIGITS) continue;
        intDigits++;
      }
      out += ch;
    } else if ((ch === "." || ch === ",") && !seenSeparator) {
      seenSeparator = true;
      out += ch;
    }
  }
  return out;
}

/**
 * Converts filtered field text to a canonical, locale-free decimal string
 * ("1234.56"), or null when it contains no digits. Forms store this value.
 */
export function parseTypedAmount(text: string): string | null {
  const digitsOnly = text.replace(/[.,]/g, "");
  if (!digitsOnly) return null;

  const at = text.search(/[.,]/);
  if (at === -1) return text;

  // ".5" → 0.5 and "12." → 12: both are legal mid-typing states.
  const int = text.slice(0, at) || "0";
  const dec = text.slice(at + 1);
  return dec ? `${int}.${dec}` : int;
}

/* ---------------------------------- */
/*            Pasted input            */
/* ---------------------------------- */

/**
 * Parses pre-formatted text (bank statement, spreadsheet) to a canonical
 * amount, or null if unparseable, negative or over MAX_INT_DIGITS.
 *
 * Non-digit, non-separator characters are stripped. Separators are all
 * grouping when they are identical and each is followed by exactly three
 * digits; otherwise the last one is the decimal. A single separator followed
 * by three digits is ambiguous and resolved by `locale`. More than two
 * decimals are rounded to cents. Negatives are rejected: sign is carried by
 * entry_type, not amount.
 */
export function parsePastedAmount(
  text: string,
  locale: MoneyLocale = DEFAULT_MONEY_LOCALE,
): string | null {
  const cleaned = text.replace(/[^\d.,-]/g, "");
  if (cleaned.includes("-")) return null;
  if (!/\d/.test(cleaned)) return null;

  // "1.234,56" → groups ["1", "234", "56"], separators [".", ","].
  const groups = cleaned.split(/[.,]/);
  const separators = cleaned.match(/[.,]/g) ?? [];

  let int = cleaned;
  let dec = "";
  if (separators.length > 0) {
    const uniform = separators.every((s) => s === separators[0]);
    const allThrees = groups.slice(1).every((g) => g.length === 3);

    // Multiple uniform separators with 3-digit groups must be grouping; a
    // single one is ambiguous and defers to the locale.
    const grouping =
      uniform &&
      allThrees &&
      (separators.length > 1 || separators[0] === SEPARATORS[locale].group);

    int = grouping ? groups.join("") : groups.slice(0, -1).join("");
    dec = grouping ? "" : groups[groups.length - 1];
  }

  int = int.replace(/[.,]/g, "") || "0";
  if (int.replace(/^0+(?=\d)/, "").length > MAX_INT_DIGITS) return null;

  const value = Number(dec ? `${int}.${dec}` : int);
  if (Number.isNaN(value)) return null;

  const rounded = Math.round(value * 100) / 100;
  if (rounded > MAX_AMOUNT) return null;
  return toMoneyString(rounded);
}

/* ---------------------------------- */
/*              Display               */
/* ---------------------------------- */

/**
 * Formats a canonical amount for a blurred field: grouped, always two
 * decimals, no currency symbol (the label carries it).
 */
export function formatAmount(
  canonical: string,
  locale: MoneyLocale = DEFAULT_MONEY_LOCALE,
): string {
  const n = Number(canonical);
  if (canonical === "" || Number.isNaN(n)) return "";
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    minimumFractionDigits: DECIMAL_PLACES,
    maximumFractionDigits: DECIMAL_PLACES,
  }).format(n);
}

/**
 * Formats a stored amount for read-only display. All rendered amounts must
 * go through this so cells and fields agree.
 */
export function displayAmount(
  n: number,
  locale: MoneyLocale = DEFAULT_MONEY_LOCALE,
): string {
  return formatAmount(toMoneyString(n), locale);
}

/**
 * Formats a canonical amount for a focused field: locale decimal separator,
 * no grouping. Grouping is omitted because it shifts as digits are added and
 * would displace the caret.
 */
export function toRawAmount(
  canonical: string,
  locale: MoneyLocale = DEFAULT_MONEY_LOCALE,
): string {
  if (canonical === "" || Number.isNaN(Number(canonical))) return "";
  // Not round-tripped through Number: "12.50" would become "12.5" and lose
  // a cent digit on refocus.
  return canonical.replace(".", SEPARATORS[locale].decimal);
}

/* ---------------------------------- */
/*             Validation             */
/* ---------------------------------- */

/**
 * Shared validation. Not exported: `floor` is the only difference between
 * the two public rules, and exposing it would let callers allow zero amounts.
 */
function checkAmount(
  canonical: string,
  floor: number,
  locale: MoneyLocale,
): string | null {
  if (canonical.trim() === "") return "Enter an amount";

  const n = Number(canonical);
  if (Number.isNaN(n)) return "Enter a valid amount";
  if (n < floor)
    return `Amount must be at least ${formatAmount(toMoneyString(floor), locale)}`;
  if (n > MAX_AMOUNT)
    return `Amount must be at most ${formatAmount(toMoneyString(MAX_AMOUNT), locale)}`;
  return null;
}

/**
 * Validates a transaction, goal target or contribution amount (floor 0.01).
 * Covers what the typing filter cannot: empty, zero, and values arriving by
 * paste or from the API.
 */
export function validateAmount(
  canonical: string,
  locale: MoneyLocale = DEFAULT_MONEY_LOCALE,
): string | null {
  return checkAmount(canonical, MIN_AMOUNT, locale);
}

/**
 * Validates an opening balance, which may be zero (floor 0). A separate
 * function rather than an option so zero cannot be enabled for transactions
 * by accident. Negatives are still rejected.
 */
export function validateOpeningBalance(
  canonical: string,
  locale: MoneyLocale = DEFAULT_MONEY_LOCALE,
): string | null {
  return checkAmount(canonical, 0, locale);
}
