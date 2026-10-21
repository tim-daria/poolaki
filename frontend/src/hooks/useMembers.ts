/** @file Loads the current workspace's members once per mount. */

import { useEffect, useState } from "react";
import { useCurrentOrg } from "../context/useCurrentOrg";
import { fetchMembers, type Member } from "../lib/organizations";

/** Empty until loaded; a failed load leaves it empty, so the member filter stays hidden. */
export function useMembers(): Member[] {
  const org = useCurrentOrg();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMembers(org.id, controller.signal)
      .then(({ members }) => setMembers(members))
      .catch(() => {
        // Aborts come from unmount or org switch; other failures degrade to no filter.
      });
    return () => controller.abort();
  }, [org.id]);

  return members;
}
