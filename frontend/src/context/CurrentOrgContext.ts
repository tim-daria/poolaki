import { createContext } from "react";
import type { Organization } from "../lib/organizations";

/**
 * The org resolved from the :orgId URL segment. Route-scoped: changes on every
 * switch. Supplied by OrgLayout (Step 6).
 *
 * There is no setter here, and that is the point — the current org is derived
 * from the URL, never stored. "State disagrees with the URL" is unrepresentable.
 */
export const CurrentOrgContext = createContext<Organization | null>(null);
