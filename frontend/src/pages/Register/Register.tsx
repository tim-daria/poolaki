/** @file Sign-up page: email/username/password form and the 42 OAuth entry point. */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router";
import { Alert, Button, Divider, Link, Stack, Typography } from "@mui/material";
import { useAuth } from "../../context/useAuth";
import { getCsrfToken } from "../../lib/csrf";
import {
  ALREADY_AUTHENTICATED,
  parseAllauthErrors,
  redirectErrorMessage,
  type AllauthError,
} from "../../lib/authErrors";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import { AuthField } from "../../components/Auth/AuthField";
import { Intra42Button } from "../../components/Auth/Intra42Button";
import { LegalNotice } from "../../components/Auth/LegalNotice";
import type { User } from "../../context/AuthContext";

/** 42 sign-ups bypass this form entirely; they complete via `/oauth-callback`. */
function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  /** Failure message for client-side validation or the signup request. */
  const [error, setError] = useState("");

  /**
   * Separate from `error`: an existing session is rendered as guidance, not as
   * a form failure.
   */
  const [alreadySignedIn, setAlreadySignedIn] = useState(false);

  /**
   * OAuth failure passed back via `?error=` (OAuthCallback routes the signup
   * flow here). Read once from the URL and kept separate from `error` so form
   * submissions do not clear it.
   */
  const [searchParams] = useSearchParams();
  const [oauthError] = useState(() =>
    redirectErrorMessage(searchParams.get("error")),
  );

  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    // Ensure the CSRF cookie exists before the first POST.
    void fetch("/api/v1/csrf/", { credentials: "include" });
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setAlreadySignedIn(false);

    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }

    const res = await fetch("/_allauth/browser/v1/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      credentials: "include",
      body: JSON.stringify({
        username,
        email,
        password,
        password2,
      }),
    });

    let data: { data?: { user: User }; errors?: AllauthError[] } | null = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON body (e.g. HTML error page); handled by the fallback message below.
    }

    // A 2xx alone is not enough: only a user object in the body confirms a session.
    if (res.ok && data?.data?.user) {
      setUser(data.data.user);
      navigate("/");
    } else if (res.status === ALREADY_AUTHENTICATED) {
      setAlreadySignedIn(true);
    } else {
      const msg = parseAllauthErrors(
        data?.errors,
        "Sign-up failed. Please check the details above.",
      );
      setError(msg);
    }
  }

  return (
    <AuthLayout footer={<LegalNotice />}>
      <Typography
        sx={{
          textAlign: "right",
          fontSize: "0.85rem",
          color: "text.secondary",
        }}
      >
        Already have an account?{" "}
        <Link
          component={RouterLink}
          to="/login"
          underline="hover"
          sx={{ fontWeight: 700, color: "text.primary" }}
        >
          Login
        </Link>
      </Typography>

      <Typography variant="h2" component="h1" sx={{ fontWeight: 800, my: 2 }}>
        Sign up
      </Typography>

      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        <AuthField
          id="email"
          label="Email"
          type="email"
          casing="username"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="username@example.com"
          autoFocus
          required
        />
        <AuthField
          id="username"
          label="Username"
          casing="username"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          required
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
        />
        <AuthField
          id="password2"
          label="Confirm password"
          type="password"
          value={password2}
          onChange={setPassword2}
          autoComplete="new-password"
          required
        />

        {error && <Alert severity="error">{error}</Alert>}

        {alreadySignedIn && (
          <Alert severity="info">
            You are already signed in.{" "}
            <Link component={RouterLink} to="/" underline="hover">
              Continue to the app
            </Link>
            , or sign out there first to create another account.
          </Alert>
        )}

        <Button type="submit" variant="contained" sx={{ py: 1.25, mt: 1 }}>
          Sign up
        </Button>
      </Stack>

      <Divider sx={{ my: 3, color: "text.secondary", fontSize: "0.85rem" }}>
        or
      </Divider>

      {oauthError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {oauthError}
        </Alert>
      )}
      <Intra42Button label="Sign up with 42" flow="signup" />
    </AuthLayout>
  );
}

// `Component` is the export name react-router's route-level `lazy` expects.
export { Register as Component };
