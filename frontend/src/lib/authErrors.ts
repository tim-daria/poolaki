/** @file Maps allauth error codes and OAuth redirect `?error=` codes to user-facing messages. */

export interface AllauthError {
  message: string;
  code?: string;
}

/**
 * allauth status for login/signup while a session already exists. The body
 * carries no `errors` array, so callers must branch on the status alone.
 */
export const ALREADY_AUTHENTICATED = 409;

/** Exported only because the `fetch` try/catch lives in the page components. */
export const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

/** Must never hint at bad credentials; the failure is not the user's. */
const SERVER_ERROR_MESSAGE =
  "Something went wrong on our end. Please try again in a moment.";

/** Overrides for codes returned in an allauth response body. */
const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect username/email or password.",
  user_not_found: "No account exists with that username or email.",
  username_password_mismatch: "Incorrect password.",
  email_password_mismatch: "Incorrect password.",
  invalid_login: "Please enter your username or email and password.",
  too_many_login_attempts:
    "Too many failed login attempts. Please try again later.",
  account_inactive: "This account has been disabled.",
  // email_verification_required:
  //   "Please verify your email address before logging in.",
  email_taken: "This email is already in use.",
  username_taken: "This username is already taken.",
  password_too_short: "Password must be at least 8 characters long.",
  password_too_common: "Password is too common. Please choose a stronger one.",
  password_entirely_numeric: "Password cannot be entirely numeric.",
  password_too_similar: "Password is too similar to your personal information.",
  required: "This field is required.",
};

/**
 * Messages for `?error=` codes arriving via URL on /login and /register.
 * Sources: the backend SocialAccountAdapter (`account_not_found`), OAuthCallback
 * (`oauth-failed`), and codes forwarded verbatim from the OAuth provider.
 */
const REDIRECT_MESSAGES: Record<string, string> = {
  account_not_found:
    "No 42 account is linked to this login. Please sign up first.",
  "oauth-failed": "Signing in with 42 did not complete. Please try again.",
  // Standard OAuth2 code: user declined at the provider's consent prompt.
  access_denied: "The 42 authorization was cancelled.",
};

/**
 * Returns "" for a missing code. Unknown codes still yield a generic message,
 * since providers may emit codes not listed above.
 */
export function redirectErrorMessage(code: string | null): string {
  if (!code) return "";
  return (
    REDIRECT_MESSAGES[code] ?? "Signing in with 42 failed. Please try again."
  );
}

/**
 * Only the first error is surfaced. A mapped message takes precedence over the
 * server's own text; `fallback` is used when no errors are present.
 */
function parseAllauthErrors(
  errors: AllauthError[] | undefined,
  fallback: string,
): string {
  if (!errors || errors.length === 0) return fallback;

  const err = errors[0];
  const text = (err.code ? CODE_MESSAGES[err.code] : undefined) ?? err.message;
  return text;
}

/**
 * allauth answers 429 for every rate-limited action (login, signup, password
 * change) with no error code, so one message has to fit them all.
 */
const RATE_LIMIT_MESSAGE = "Too many attempts. Please try again later.";

/**
 * Message for a non-2xx allauth response. 5xx is checked as a range so proxy
 * statuses (502/503/504) are covered; 409 is not handled here because callers
 * branch on it before reaching this function.
 */
export function authErrorMessage(
  status: number,
  errors: AllauthError[] | undefined,
  fallback: string,
): string {
  if (status >= 500) return SERVER_ERROR_MESSAGE;
  if (status === 429) return RATE_LIMIT_MESSAGE;
  return parseAllauthErrors(errors, fallback);
}
