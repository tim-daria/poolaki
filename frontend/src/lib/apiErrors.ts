/** @file Reads the first message out of a Django/DRF error body, whatever shape it takes. */

/** A message and the wire field it belongs to; `field` is "" for body-level messages. */
export type ApiProblem = { field: string; message: string };

// Keys whose messages describe the whole request, not one field, so the key
// must not surface in the UI as a "Detail: …" or "Errors: …" prefix.
const NON_FIELD_KEYS = new Set(["detail", "non_field_errors", "errors"]);

function walk(body: unknown, field: string): ApiProblem | null {
  // An empty string is "no message": the caller's fallback reads better than a blank.
  if (typeof body === "string") return body ? { field, message: body } : null;
  if (Array.isArray(body)) {
    for (const item of body) {
      const problem = walk(item, field);
      if (problem) return problem;
    }
    return null;
  }
  if (body && typeof body === "object") {
    for (const [key, value] of Object.entries(body)) {
      const problem = walk(value, NON_FIELD_KEYS.has(key) ? "" : key);
      if (problem) return problem;
    }
  }
  return null;
}

/** 400 and 403 bodies carry a message meant for the user. */
export function isRejection(res: Response): boolean {
  return res.status === 400 || res.status === 403;
}

/** The body's first message, or `fallback` when the body is empty or not JSON. */
export async function rejectionMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  return firstErrorMessage(body) ?? fallback;
}

/**
 * First message in an error body as a (field, message) pair, or null when
 * there is none. Handles service bodies {errors: [msg]} and the DRF shapes
 * {field: [msg]}, {detail: msg}, {non_field_errors: [msg]} and a bare [msg].
 */
export function firstProblem(body: unknown): ApiProblem | null {
  return walk(body, "");
}

/** `firstProblem` for callers without field labels: only the message. */
export function firstErrorMessage(body: unknown): string | null {
  return firstProblem(body)?.message ?? null;
}
