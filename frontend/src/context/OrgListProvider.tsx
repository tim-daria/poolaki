import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { OrgListContext } from "./OrgListContext";
import { fetchOrganizations } from "../lib/organizations";
import type { Organization } from "../lib/organizations";

/**
 * Holds the user's organization list. Mounted as a pathless layout route inside
 * ProtectedRoute, so it unmounts on logout rather than leaking into the next
 * user's session.
 */
export function OrgListProvider() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [lastUsedId, setLastUsedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /** Using try/catch instead of try/finally because React Compiler cannot process
   * a try block without a catch. Bailing out would cause the compiler to skip
   * auto-memoization, making `load` re-create on every render.
   *
   * ESLint react-hooks warnings are turned off in eslint.config.js for this entire file.
   * Using an inline `// eslint-disable` comment would make React Compiler skip optimizing this component.
   */
  const load = async (signal?: AbortSignal) => {
    try {
      const list = await fetchOrganizations(signal);
      setOrganizations(list.organizations);
      setLastUsedId(list.current_organization_id);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    // Abort the request on cleanup. In React StrictMode (dev mode), effects run twice;
    // this ensures an older request won't overwrite a newer response.
    void load(ac.signal).catch(() => {});
    return () => ac.abort();
  }, [load]);

  const value = { organizations, lastUsedId, loading, refresh: () => load() };

  return (
    <OrgListContext.Provider value={value}>
      <Outlet />
    </OrgListContext.Provider>
  );
}
