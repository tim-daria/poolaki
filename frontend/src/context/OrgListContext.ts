import { createContext } from "react";
import type { Organization } from "../lib/organizations";

/**
 * The *list* of orgs the user belongs to. User-scoped: fetched once per login,
 * survives every workspace switch.
 *
 * Deliberately separate from CurrentOrgContext, which is route-scoped and
 * changes on every switch. Combining them into one instance would either refetch the list
 * on each switch or need hand-written logic to avoid it.
 */
export type OrgListContextType = {
  organizations: Organization[];
  loading: boolean;
  refresh: () => Promise<void>;
};

export const OrgListContext = createContext<OrgListContextType | null>(null);
