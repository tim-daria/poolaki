interface AllauthError {
  message: string;
  code?: string;
}

const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect username/email or password.",
  account_inactive: "This account has been disabled.",
  // email_verification_required:
  //   "Please verify your email address before logging in.",
  email_taken: "Registration failed. Please check your details and try again.",
  username_taken: "Registration failed. Please check your details and try again.",
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
