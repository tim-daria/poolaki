/** @file Loads what one archived goal held, from its own rows, once per mount. */

import { useEffect, useState } from "react";
import { useCurrentOrg } from "../context/useCurrentOrg";
import { getGoalActivity, heldAtArchive } from "../lib/goalActivity";
import type { Goal } from "../lib/goals";

/**
 * Undefined while loading or for a goal that is not archived; null when the
 * rows do not say. The card mounts only when its section is unfolded, so
 * this fires once per unfold, per archived goal.
 */
export function useHeldAtArchive(goal: Goal): number | null | undefined {
  const org = useCurrentOrg();
  const [held, setHeld] = useState<number | null | undefined>(undefined);
  const archived = goal.status === "archived";

  useEffect(() => {
    if (!archived) return;
    const controller = new AbortController();
    getGoalActivity(org.id, goal.id, controller.signal)
      .then((rows) => setHeld(heldAtArchive(rows)))
      .catch(() => {
        // Aborts come from unmount; any other failure leaves the amount unknown.
      });
    return () => controller.abort();
  }, [org.id, goal.id, archived]);

  return held;
}
