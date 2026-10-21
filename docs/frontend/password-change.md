# Password change

How the "Change password" modal validates what the user types, which checks
run in the browser, which run on the server, and why the split is the way it
is.

---

## The request

The modal (`components/Modals/ChangePasswordForm.tsx`) collects three fields:
current password, new password, confirm new password. On submit it calls
`changePassword()` in `lib/account.ts`, which sends:

```
POST /_allauth/browser/v1/account/password/change
Content-Type: application/json
X-CSRFToken: <csrftoken cookie>

{ "current_password": "...", "new_password": "..." }
```

Only two fields travel. allauth's endpoint has no confirmation field, so the
confirm value never leaves the browser.

---

## What the frontend checks

| Check                   | Where                                      | How                                                   |
| ----------------------- | ------------------------------------------ | ----------------------------------------------------- |
| All three fields filled | `TextField required`                       | Native HTML form validation blocks submit while blank |
| New and confirm match   | `handleSubmit` in `ChangePasswordForm.tsx` | String comparison; shows "New passwords don't match." |

That is the whole list. Nothing on the client checks password strength, and
nothing can check the current password: only the server holds the hash.

The match check exists on the frontend **because it cannot exist anywhere
else**. The API takes a single `new_password` and would happily save a typo.
It is a usability guard, not a security control.

---

## What the backend checks

Every request, regardless of what the browser did, goes through allauth's
`ChangePasswordInput` and the account adapter. In order:

| Check                | Where                                            | Failure                               |
| -------------------- | ------------------------------------------------ | ------------------------------------- |
| Signed-in session    | allauth headless                                 | `401`                                 |
| CSRF token           | Django middleware                                | `403`                                 |
| `new_password` given | `ChangePasswordInput`                            | `400`, code `required`                |
| Current password     | `clean_current_password` → `user.check_password` | `400`, code `enter_current_password`  |
| Password strength    | `clean_password` → `AUTH_PASSWORD_VALIDATORS`    | `400`, one code per validator (below) |
| Rate limit           | allauth                                          | `429`, no error code                  |

`AUTH_PASSWORD_VALIDATORS` in `backend/django/django_project/settings.py`
enables Django's four stock validators:

| Validator                          | Rejects                                  | Code                        |
| ---------------------------------- | ---------------------------------------- | --------------------------- |
| `MinimumLengthValidator`           | fewer than 8 characters                  | `password_too_short`        |
| `CommonPasswordValidator`          | entries in Django's common-password list | `password_too_common`       |
| `NumericPasswordValidator`         | digits only                              | `password_entirely_numeric` |
| `UserAttributeSimilarityValidator` | too close to the username or email       | `password_too_similar`      |

`current_password` is only required when the user has a usable password. An
account created through the 42 OAuth flow has none, so for that user the field
is optional and skipped.

---

## How errors reach the screen

A non-2xx response is turned into a `PasswordChangeError` in `lib/account.ts`
and rendered in the red `Alert` under the fields.

- `401` gets a fixed message asking the user to sign out and in again. There
  is no reauthentication flow in the app, so that is the only way through.
- Everything else goes through `authErrorMessage()` in `lib/authErrors.ts`.
  `5xx` and `429` get fixed messages. For `400`, the first entry of the
  response's `errors` array is used: a known `code` is mapped to our own text
  (the four validator codes are in `CODE_MESSAGES`), and an unknown code such
  as `enter_current_password` falls through to allauth's own `message`.
- A failed `fetch` (no response at all) shows the network message.

A `400` in the browser console is therefore **expected**, not a bug. It is the
browser logging the non-2xx fetch; the form has already shown the reason.

---

## Why strength is not checked twice

Duplicating the validators in TypeScript would mean two copies of the rules
that drift apart, and the common-password list is tens of thousands of entries
that have no business in the bundle. The server answers in one round trip
with a specific code, and the form shows it. Mirroring the rules client-side
would only save that round trip.

---

## Files

| File                                                    | Role                                  |
| ------------------------------------------------------- | ------------------------------------- |
| `frontend/src/components/Modals/ChangePasswordForm.tsx` | The modal, match check, error display |
| `frontend/src/lib/account.ts`                           | The request and status handling       |
| `frontend/src/lib/authErrors.ts`                        | Code → message mapping                |
| `frontend/src/lib/csrf.ts`                              | Reads the `csrftoken` cookie          |
| `backend/django/django_project/settings.py`             | `AUTH_PASSWORD_VALIDATORS`            |
| `backend/django/core/adapters.py`                       | `AccountAdapter` (error messages)     |
