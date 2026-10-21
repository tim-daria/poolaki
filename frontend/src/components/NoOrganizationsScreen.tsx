/** @file Terminal screen for an account with zero workspaces. */

import { Button } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useLogout } from "../context/useLogout";
import { ErrorScreen } from "./ErrorScreen";

/**
 * Shouldn't be reachable — the signup signal creates a personal org for every
 * user — so surface it as an error rather than a permanent spinner.
 *
 * Renders at "/" without the AppLayout, so there is no header to log out
 * from; without the button the screen is a dead end.
 */
export function NoOrganizationsScreen() {
  const logout = useLogout();

  return (
    <ErrorScreen
      role="alert"
      title="No workspaces found"
      actions={
        <Button
          variant="outlined"
          onClick={logout}
          startIcon={<LogoutIcon fontSize="small" />}
        >
          Logout
        </Button>
      }
    >
      Your account has no workspaces, which shouldn&apos;t happen. Please
      contact support.
    </ErrorScreen>
  );
}
