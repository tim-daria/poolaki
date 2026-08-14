export interface AllauthError {
  message: string;
  code?: string;
}

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

export function parseAllauthErrors(
  errors: AllauthError[] | undefined,
  fallback: string,
): string {
  if (!errors || errors.length === 0) return fallback;

  const err = errors[0];
  const text = (err.code ? CODE_MESSAGES[err.code] : undefined) ?? err.message;
  return text;
}
