import { Button } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useLogout } from "../context/useLogout";

/**
 * The user belongs to zero organizations. Shouldn't be reachable — the signup
 * signal creates a personal org for every user — so surface it as an error
 * rather than hiding it behind a permanent spinner.
 *
 * This renders at "/" without the AppLayout, so there is no header to log out
 * from. Without the button below the screen is a dead end.
 */
export function NoOrganizationsScreen() {
  const logout = useLogout();

  return (
    <div role="alert">
      <h2>No workspaces found</h2>
      <p>
        Your account has no workspaces, which shouldn&apos;t happen. Please
        contact support.
      </p>
      <Button onClick={logout} startIcon={<LogoutIcon fontSize="small" />}>
        Logout
      </Button>
    </div>
  );
}
