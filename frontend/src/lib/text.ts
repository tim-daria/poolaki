/**
 * @file Text normalisation shared by the transaction and goal forms, so what
 * is stored is the same whichever form sent it, plus the truncation toasts
 * apply to names before showing them.
 */

/** Longest name a toast shows in full; longer ones end in an ellipsis. */
export const MAX_TOAST_NAME_LENGTH = 20;

/**
 * Collapses internal whitespace and trims. Returns "" for whitespace-only
 * input so callers can fall back with `||`.
 */
export function formatName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function formatUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Appended to a cut name; counts towards the limit. */
const ELLIPSIS = "...";

/**
 * Cuts `name` to `max` characters, the last three being "...", so a 100-char
 * workspace name cannot blow a one-line toast out of its frame. Input at or
 * under the limit is returned unchanged.
 */
export function truncateName(
  name: string,
  max = MAX_TOAST_NAME_LENGTH,
): string {
  return name.length > max
    ? `${name.slice(0, max - ELLIPSIS.length)}${ELLIPSIS}`
    : name;
}
