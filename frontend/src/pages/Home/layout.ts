/**
 * @file Overview page breakpoints. A separate module so components and the
 * page agree on where the desktop layout begins.
 */

/** Below this the page is the phone layout: one column, smaller figures, folded rows. */
export const DESKTOP_MIN_WIDTH = 820;
export const DESKTOP = `@media (min-width:${DESKTOP_MIN_WIDTH}px)`;
export const DESKTOP_QUERY = `(min-width:${DESKTOP_MIN_WIDTH}px)`;
