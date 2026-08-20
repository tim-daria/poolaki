import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { useOrgList } from "../context/useOrgList";
import { CurrentOrgContext } from "../context/CurrentOrgContext";
import { selectOrganization, OrgForbiddenError } from "../lib/organizations";
import { getCsrfToken } from "../lib/csrf";
import { NoAccessScreen } from "./NoAccessScreen";
import { SyncFailedScreen } from "./SyncFailedScreen";
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
/** Outcome of the session sync, tagged with the workspace it refers to. */
type Sync = { orgId: number; status: "ready" | "denied" | "failed" };

export function OrgLayout() {
  const { orgId } = useParams();
  const { organizations, loading } = useOrgList();
  const [sync, setSync] = useState<Sync | null>(null);
  const [attempt, setAttempt] = useState(0);

  // URL params are strings, org.id is a number.
  const org = organizations.find((o) => String(o.id) === orgId);
  const currentOrgId = org?.id;

  useEffect(() => {
    if (currentOrgId === undefined) return;
    let stale = false;

    selectOrganization(currentOrgId, getCsrfToken())
      .then(() => {
        if (!stale) setSync({ orgId: currentOrgId, status: "ready" });
      })
      .catch((e) => {
        // Every failure has to land somewhere. Swallowing the non-403 case left
        // the page area on "Loading…" forever, with nothing to tell the user.
        if (stale) return;
        setSync({
          orgId: currentOrgId,
          status: e instanceof OrgForbiddenError ? "denied" : "failed",
        });
      });
    // A late reply from a previous workspace must not overwrite a newer one.
    return () => {
      stale = true;
    };
  }, [currentOrgId, attempt]);

  // A result for any other workspace means this one is still in flight.
  // Compare `sync` itself, not sync?.orgId: with no match and no result yet
  // both sides are undefined, which would read as "this one is done".
  const status = sync && sync.orgId === currentOrgId ? sync.status : "syncing";

  if (loading) return <div>Loading…</div>;
  if (!org || status === "denied") return <NoAccessScreen orgId={orgId} />;
  if (status === "failed")
    return <SyncFailedScreen onRetry={() => setAttempt((a) => a + 1)} />;

  return (
    <CurrentOrgContext.Provider value={org}>
      <AppLayout syncing={status === "syncing"} />
    </CurrentOrgContext.Provider>
  );
}
