/** @file Button that starts the 42 Intra OAuth flow. */
import { Button } from "@mui/material";
import { startSocialAuth } from "../../lib/socialAuth";
import { getCsrfToken } from "../../lib/csrf";

interface Intra42ButtonProps {
  label: string;
  /** Forwarded to the callback route; only affects where a failed handshake redirects. */
  flow: "login" | "signup";
}

/** Redirects to the 42 provider; the result returns via `/oauth-callback`. */
export function Intra42Button({ label, flow }: Intra42ButtonProps) {
  return (
    <Button
      fullWidth
      onClick={() =>
        startSocialAuth(
          "intra42",
          "login",
          `/oauth-callback?flow=${flow}`,
          getCsrfToken(),
        )
      }
      sx={{
        py: 1.25,
        fontWeight: 600,
        color: "primary.dark",
        bgcolor: "primary.light",
        "&:hover": { bgcolor: "secondary.light" },
      }}
    >
      {label}
    </Button>
  );
}
