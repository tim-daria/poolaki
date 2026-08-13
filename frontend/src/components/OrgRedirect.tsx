import { Navigate } from "react-router";
import { useOrgList } from "../context/useOrgList";
import { NoOrganizationsScreen } from "./NoOrganizationsScreen";

/**
 * Handles the root route ("/") by resolving the best workspace to land on and
 * redirecting to `/o/:orgId` inside active session.
 *
 * - Resolution order: Validated last-used workspace -> Personal workspace -> First available.
 * - Uses `replace` so the root entry isn't saved in history, preventing a Back-button trap.
 * - Relies on `NoAccessScreen` to act as a static terminal UI (no auto-redirects)
 *   to guarantee the redirect chain cannot enter an infinite loop.
 */

export function OrgRedirect() {
  const { organizations, lastUsedId, loading } = useOrgList();

  if (loading) return <div>Loading…</div>;

  const target =
    organizations.find((o) => o.id === lastUsedId) ??
    organizations.find((o) => o.is_personal) ??
    organizations[0];

  if (!target) return <NoOrganizationsScreen />;

  // `replace` — otherwise Back lands on "/" and gets bounced forward again.
  return <Navigate to={`/o/${target.id}`} replace />;
}
