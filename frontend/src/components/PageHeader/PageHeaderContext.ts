import { createContext, useContext } from "react";

/**
 * DOM nodes the persistent page header exposes for pages to portal into.
 *
 * Slots are state, not refs: a portal can only target a node that already
 * exists, so the bar has to re-render its consumers once the elements mount.
 */
export interface PageHeaderSlots {
  titleSlot: HTMLElement | null;
  actionSlot: HTMLElement | null;
}

export const PageHeaderContext = createContext<PageHeaderSlots | null>(null);

/**
 * Null outside the app shell. Auth and legal pages render no header, and a
 * shared component that throws there would make itself unusable on them.
 */
export function usePageHeaderSlots(): PageHeaderSlots | null {
  return useContext(PageHeaderContext);
}
