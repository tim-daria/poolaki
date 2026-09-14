/**
 * @file Per-page title and subtitle, declared as `handle` on the routes in
 * routes.tsx and read back here.
 *
 * On the route rather than in the page because two consumers need it and only
 * one of them is the page: the heading renders inside it, the browser tab is
 * set from above it.
 */

import { useEffect } from "react";
import { useMatches } from "react-router";

const SITE_NAME = "Poolaki";

export interface RouteMeta {
  title: string;
  subtitle?: string;
}

/**
 * `handle` is typed `unknown`, so its shape has to be checked at the boundary.
 * check for !== null because null is also an object
 */
function hasMeta(handle: unknown): handle is RouteMeta {
  return (
    typeof handle === "object" &&
    handle != null &&
    typeof (handle as RouteMeta).title === "string"
  );
}

/**
 * Meta from the deepest matched route that declares any, or null.
 *
 * Searched from the leaf up so a nested route can override its parent, and so
 * layout routes without meta are skipped rather than ending the search.
 */
export function useRouteMeta(): RouteMeta | null {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const { handle } = matches[i];
    if (hasMeta(handle)) return handle;
  }
  return null;
}

/** Keeps document.title in step with the route. Call once, at the root. */
export function useDocumentTitle(): void {
  const meta = useRouteMeta();
  const title = meta?.title;

  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}
