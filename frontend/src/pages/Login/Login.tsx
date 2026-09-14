/** @file Login page: username/email + password form and the 42 OAuth entry point. */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router";
import { Alert, Button, Divider, Link, Stack, Typography } from "@mui/material";
import { useAuth } from "../../context/useAuth";
import { getCsrfToken } from "../../lib/csrf";
import {
  ALREADY_AUTHENTICATED,
  NETWORK_ERROR_MESSAGE,
  authErrorMessage,
  redirectErrorMessage,
  type AllauthError,
} from "../../lib/authErrors";
import { AuthLayout } from "../../components/Auth/AuthLayout";
import { AuthField } from "../../components/Auth/AuthField";
import { Intra42Button } from "../../components/Auth/Intra42Button";
import { LegalNotice } from "../../components/Auth/LegalNotice";
import type { User } from "../../context/AuthContext";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  /** Failure message for the login request. */
  const [error, setError] = useState("");

  /**
   * Separate from `error`: an existing session (e.g. signed in from another tab)
   * is rendered as guidance, not as a form failure.
   */
  const [alreadySignedIn, setAlreadySignedIn] = useState(false);

  /**
   * OAuth failure passed back via `?error=`. Read once from the URL and kept
   * separate from `error` so form submissions do not clear it.
   */
  const [searchParams] = useSearchParams();
  const [oauthError] = useState(() =>
    redirectErrorMessage(searchParams.get("error")),
  );
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    // Ensure the CSRF cookie exists before the first POST.
    fetch("/api/v1/csrf/", { credentials: "include" });
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");
    setAlreadySignedIn(false);

    let res: Response;
    try {
      res = await fetch("/_allauth/browser/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        credentials: "include",
        body: JSON.stringify(
          identifier.includes("@")
            ? { email: identifier, password }
            : { username: identifier, password },
        ),
      });
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      return;
    }

    let data: { data?: { user: User }; errors?: AllauthError[] } | null = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON body (e.g. HTML error page); handled by the fallback message below.
    }

    if (res.ok && data?.data?.user) {
      setUser(data.data.user);
      navigate("/");
    } else if (res.status === ALREADY_AUTHENTICATED) {
      setAlreadySignedIn(true);
    } else {
      setError(
        authErrorMessage(
          res.status,
          data?.errors,
          "Login failed. Please check your credentials.",
        ),
      );
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
        Not registered yet?{" "}
        <Link
          component={RouterLink}
          to="/register"
          underline="hover"
          sx={{ fontWeight: 700, color: "text.primary" }}
        >
          Sign up
        </Link>
      </Typography>

      <Typography variant="h2" component="h1" sx={{ fontWeight: 800, my: 2 }}>
        Login
      </Typography>

      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        <AuthField
          id="identifier"
          label="Username or email"
          casing="username"
          value={identifier}
          onChange={setIdentifier}
          autoComplete="username"
          placeholder="username@example.com"
          autoFocus
          required
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />

        {error && <Alert severity="error">{error}</Alert>}

        {alreadySignedIn && (
          <Alert severity="info">
            You are already signed in.{" "}
            <Link component={RouterLink} to="/" underline="hover">
              Continue to the app
            </Link>
            , or sign out there first to use a different account.
          </Alert>
        )}

        <Button type="submit" variant="contained" sx={{ py: 1.25, mt: 1 }}>
          Login
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
      <Intra42Button label="Login with 42" flow="login" />
    </AuthLayout>
  );
}

// `Component` is the export name react-router's route-level `lazy` expects.
export { Login as Component };
