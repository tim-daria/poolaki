/** @file Loads the current workspace's categories once per mount. */

import { useEffect, useState } from "react";
import { useCurrentOrg } from "../context/useCurrentOrg";
import { fetchCategories, type Category } from "../lib/categories";

/** Empty until loaded; a failed load leaves it empty, so rows show no label. */
export function useCategories(): Category[] {
  const org = useCurrentOrg();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(org.id, controller.signal)
      .then(setCategories)
      .catch(() => {
        // Aborts come from unmount or org switch; other failures degrade to no labels.
      });
    return () => controller.abort();
  }, [org.id]);

  return categories;
}
