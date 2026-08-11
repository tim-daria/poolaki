import { Link } from "react-router";

interface Props {
  orgId?: string;
}

/**
 * Terminal UI screen for unreachable workspaces (403 / Not Found).
 *
 * CRITICAL: Never use auto-redirects (e.g., `<Navigate to="/">`) here.
 * This screen must remain a static terminal node with a manual link back
 * to prevent infinite redirect loops (`/` -> `/o/:orgId` -> no access -> `/`).
 */
export function NoAccessScreen({ orgId }: Props) {
  return (
    <div role="alert">
      <h2>Workspace unavailable</h2>
      <p>
        This workspace doesn&apos;t exist or you don&apos;t have access to it.
        {orgId ? ` (id: ${orgId})` : ""}
      </p>
      <Link to="/">Back to your workspaces</Link>
    </div>
  );
}
