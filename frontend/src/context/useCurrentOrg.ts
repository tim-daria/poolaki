import { useContext } from "react";
import { CurrentOrgContext } from "./CurrentOrgContext";
import type { Organization } from "../lib/organizations";

/**
 * The current organization. Throws outside OrgLayout, which turns a confusing
 * null-crash somewhere downstream into a clear message at the call site.
 */
export function useCurrentOrg(): Organization {
  const ctx = useContext(CurrentOrgContext);
  if (!ctx) throw new Error("useCurrentOrg must be used inside OrgLayout");
  return ctx;
}
