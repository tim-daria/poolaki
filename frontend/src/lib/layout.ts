/**
 * @file Overview page breakpoints. A separate module so components and the
 * page agree on where the desktop layout begins.
 */

/**
 * Three layouts. Phone, below TABLET: one column, everything stacked.
 * Tablet, from 600px: the top card splits into its two halves, the activity
 * list is full width, and the spending and goal cards share a row. Desktop,
 * from 1024px: the activity list beside a sidebar of the two cards.
 */
export const TABLET_MIN_WIDTH = 600;
export const TABLET = `@media (min-width:${TABLET_MIN_WIDTH}px)`;
export const DESKTOP_MIN_WIDTH = 1024;
export const DESKTOP = `@media (min-width:${DESKTOP_MIN_WIDTH}px)`;
export const DESKTOP_QUERY = `(min-width:${DESKTOP_MIN_WIDTH}px)`;
/** For props that cannot take a media query in sx, e.g. a Pagination's size. */
export const PHONE_QUERY = `(max-width:${TABLET_MIN_WIDTH - 0.05}px)`;
export const PHONE = `@media ${PHONE_QUERY}`;

/**
 * Header tabs appear from here; below it the bottom bar takes over. Separate
 * from TABLET/DESKTOP on purpose: the header needs room for four tabs and
 * the switcher, the overview grid needs room for its columns.
 */
export const NAV_DESKTOP_MIN_WIDTH = 860;
export const NAV_DESKTOP = `@media (min-width:${NAV_DESKTOP_MIN_WIDTH}px)`;
export const NAV_MOBILE_QUERY = `(max-width:${NAV_DESKTOP_MIN_WIDTH - 0.05}px)`;

/** Side padding every page and the header bar share, so their edges line up at every width. */
export const PAGE_PADDING = { px: 2, [TABLET]: { px: 3 } } as const;
