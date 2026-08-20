import { useParams } from "react-router";
import { useOrgList } from "../context/useOrgList";
import { CurrentOrgContext } from "../context/CurrentOrgContext";
import { NoAccessScreen } from "./NoAccessScreen";
import { AppLayout } from "./AppLayout";

/**
 * Resolves :orgId from the URL into a workspace and provides it to the subtree.
 *
 * No network call: the list is already in memory from OrgListProvider, so a
 * switch is a lookup rather than a request. Membership is proven per request by
 * the backend, which takes the workspace from the path.
 */
export function OrgLayout() {
  const { orgId } = useParams();
  const { organizations, loading } = useOrgList();
  // URL params are strings, org.id is a number. `===` across types is always
  // false, which would show "workspace unavailable" for a valid workspace.
  const org = organizations.find((o) => String(o.id) === orgId);

  if (loading) return <div>Loading…</div>;
  if (!org) return <NoAccessScreen orgId={orgId} />;

  return (
    <CurrentOrgContext.Provider value={org}>
      <AppLayout />
    </CurrentOrgContext.Provider>
  );
}
