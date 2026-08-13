import { useContext } from "react";
import { OrgListContext } from "./OrgListContext";
import type { OrgListContextType } from "./OrgListContext";

export function useOrgList(): OrgListContextType {
  const ctx = useContext(OrgListContext);
  if (!ctx) throw new Error("useOrgList must be used inside OrgListProvider");
  return ctx;
}
