import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { useOrgList } from "../context/useOrgList";
import { CurrentOrgContext } from "../context/CurrentOrgContext";
import { selectOrganization, OrgForbiddenError } from "../lib/organizations";
import { getCsrfToken } from "../lib/csrf";
import { NoAccessScreen } from "./NoAccessScreen";
import { AppLayout } from "./AppLayout";

/**
 * Resolves :orgId from the URL into a workspace and provides it to the subtree.
 *
 * Temporary: the backend still reads the current workspace from the Django
 * session, so this pushes the URL's answer into the session before the page
 * loads data.
 * The shell itself (AppLayout with sidebar Menu and Header)
 * needs only the workspace list, so `syncing`
 * holds back the page area rather than the whole tree. Both go away once the
 * API takes the workspace in the path.
 */
export function OrgLayout() {
  const { orgId } = useParams();
  const { organizations, loading } = useOrgList();
  const [syncedOrgId, setSyncedOrgId] = useState<number | null>(null);
  const [deniedOrgId, setDeniedOrgId] = useState<number | null>(null);

  // URL params are strings, org.id is a number.
  const org = organizations.find((o) => String(o.id) === orgId);
  const currentOrgId = org?.id;

  useEffect(() => {
    if (currentOrgId === undefined) return;
    let stale = false;

    selectOrganization(currentOrgId, getCsrfToken())
      .then(() => {
        if (!stale) setSyncedOrgId(currentOrgId);
      })
      .catch((e) => {
        if (!stale && e instanceof OrgForbiddenError)
          setDeniedOrgId(currentOrgId);
      });
    // A late reply from a previous workspace must not overwrite a newer one.
    return () => {
      stale = true;
    };
  }, [currentOrgId]);

  if (loading) return <div>Loading…</div>;
  if (!org || deniedOrgId === org.id) return <NoAccessScreen orgId={orgId} />;

  return (
    <CurrentOrgContext.Provider value={org}>
      <AppLayout syncing={syncedOrgId !== org.id} />
    </CurrentOrgContext.Provider>
  );
}
