/** @file Loads the current workspace's goals once per mount. */

import { useEffect, useState } from "react";
import { useCurrentOrg } from "../context/useCurrentOrg";
import { getGoals, type Goal } from "../lib/goals";

/** Empty until loaded; a failed load leaves it empty, so rows show no label. */
export function useGoals(refreshKey?: unknown): Goal[] {
  const org = useCurrentOrg();
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    getGoals(org.id, controller.signal)
      .then(setGoals)
      .catch(() => {
        // Aborts come from unmount or org switch; other failures degrade to no labels.
      });
    return () => controller.abort();
  }, [org.id, refreshKey]);

  return goals;
}
