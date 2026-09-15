/**
 * @file Account-level HTTP: password change via allauth, plus flags for the
 * profile and deletion actions that have no backend route yet.
 */

import { authErrorMessage } from "./authErrors";

export const CAN_EDIT_PROFILE = false;
export const CAN_DELETE_ACCOUNT = false;

/** Carries a message meant for the form, not a generic failure. */
export class PasswordChangeError extends Error {}

/** POST /_allauth/browser/v1/account/password/change */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  csrfToken: string,
): Promise<void> {
  const res = await fetch("/_allauth/browser/v1/account/password/change", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
    credentials: "include",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (res.ok) return;
  // allauth answers 401 when the session needs reauthentication; there is no
  // reauth flow in the app, so signing in again is the only way through.
  if (res.status === 401) {
    throw new PasswordChangeError(
      "Please sign out and sign in again before changing your password.",
    );
  }
  const body = await res.json().catch(() => null);
  throw new PasswordChangeError(
    authErrorMessage(
      res.status,
      body?.errors,
      "Could not change the password. Please try again.",
    ),
  );
}
