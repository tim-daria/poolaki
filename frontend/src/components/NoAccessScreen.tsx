/** @file Terminal screen for a workspace the user cannot reach (missing or 403). */

import { Link as RouterLink } from "react-router";
import { Button } from "@mui/material";
import { ErrorScreen } from "./ErrorScreen";

/**
 * CRITICAL: Never use auto-redirects (e.g., `<Navigate to="/">`) here.
 * This screen must remain a static terminal node with a manual link back
 * to prevent infinite redirect loops (`/` -> `/o/:orgId` -> no access -> `/`).
 */
export function NoAccessScreen() {
  return (
    <ErrorScreen
      role="alert"
      title="Workspace unavailable"
      actions={
        <Button component={RouterLink} to="/" variant="contained">
          Back to your workspaces
        </Button>
      }
    >
      This workspace doesn&apos;t exist or you don&apos;t have access to it.
    </ErrorScreen>
  );
}
