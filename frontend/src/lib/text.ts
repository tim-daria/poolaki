/**
 * @file Text normalisation shared by the transaction and goal forms, so what
 * is stored is the same whichever form sent it.
 */

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
