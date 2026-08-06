import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../context/useAuth";
import styles from "../Register/styles.module.css";

export function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSignupFlow = searchParams.get("flow") === "signup";
  const { setUser } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/_allauth/browser/v1/auth/session", {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const sessionUser = data?.data?.user ?? null;
        if (sessionUser) {
          setUser(sessionUser);
          navigate("/", { replace: true });
        } else {
          navigate(
            isSignupFlow
              ? "/register?error=oauth-failed"
              : "/login?error=oauth-failed",
            { replace: true },
          );
        }
      })
      .catch(() => navigate("/login", { replace: true }))
      .finally(() => setChecking(false));
  }, [isSignupFlow, navigate, setUser]);

  if (checking) {
    return (
      <div className={styles.helloPage}>
        <div className={styles.formContainer}>
          <h1>Checking your 42 account</h1>
          <p>Please wait...</p>
        </div>
        <div className={styles.decorContainer}></div>
      </div>
    );
  }

  return null;
}

// Named alias for react-router's route-level `lazy`
export { OAuthCallback as Component };
