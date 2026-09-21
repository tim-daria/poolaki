/** @file Landing route after the 42 OAuth redirect; resolves the session and routes onward. */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { useAuth } from "../../context/useAuth";
import { AuthLayout } from "../../components/Auth/AuthLayout";

/**
 * Success navigates to `/`. Failure forwards `?error=` to `/register` when
 * `?flow=signup`, otherwise to `/login`, so the message renders on the page
 * the user started from.
 */
function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSignupFlow = searchParams.get("flow") === "signup";
  const authError = searchParams.get("error");
  const { setUser } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Guards against navigating from a stale effect after unmount or re-run.
    let isMounted = true;

    fetch("/_allauth/browser/v1/auth/session", {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;

        const sessionUser = data?.data?.user ?? null;
        if (sessionUser) {
          setUser(sessionUser);
          navigate("/", { replace: true });
        } else {
          const errParam = authError
            ? `?error=${authError}`
            : "?error=oauth-failed";
          const targetPath = isSignupFlow
            ? `/register${errParam}`
            : `/login${errParam}`;
          navigate(targetPath, { replace: true });
        }
      })
      .catch(() => {
        if (isMounted) navigate("/login?error=oauth-failed", { replace: true });
      })
      .finally(() => {
        if (isMounted) setChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authError, isSignupFlow, navigate, setUser]);

  if (checking) {
    return (
      <AuthLayout>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress size={24} />
          <Typography variant="h3" component="h1">
            Checking your 42 account…
          </Typography>
        </Stack>
      </AuthLayout>
    );
  }

  return null;
}

// `Component` is the export name react-router's route-level `lazy` expects.
export { OAuthCallback as Component };
