import { useState, useEffect, useCallback, useMemo } from "react";
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

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const list = await fetchOrganizations(signal);
      setOrganizations(list.organizations);
      setLastUsedId(list.current_organization_id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    // Cleanup aborts the in-flight request: StrictMode runs effects twice in
    // dev, and without it the older response can land last.
    void load(ac.signal).catch(() => {});
    return () => ac.abort();
  }, [load]);

  const value = useMemo(
    () => ({ organizations, lastUsedId, loading, refresh: () => load() }),
    [organizations, lastUsedId, loading, load],
  );

  return (
    <OrgListContext.Provider value={value}>
      <Outlet />
    </OrgListContext.Provider>
  );
}
