/** @file Terms and Privacy Policy notice shown under the auth card. */
import { Link as RouterLink } from "react-router";
import { Link } from "@mui/material";

/** Uses client-side routing; both targets are in-app routes. */
export function LegalNotice() {
  return (
    <>
      By continuing you agree to the{" "}
      <Link component={RouterLink} to="/terms" color="inherit">
        Terms
      </Link>{" "}
      and{" "}
      <Link component={RouterLink} to="/policy" color="inherit">
        Privacy Policy
      </Link>
      .
    </>
  );
}
