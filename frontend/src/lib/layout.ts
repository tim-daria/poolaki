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
/** Each element that fixes a height or must vanish on paper carries its own rule under this key. */
export const PRINT = "@media print";

/**
 * Header tabs appear from here; below it the bottom bar takes over. Separate
 * from TABLET/DESKTOP on purpose: the header needs room for the switcher,
 * four tabs and the controls, the overview grid needs room for its columns.
 * 980: the tabs sit on the page's centre line, so the wider side (switcher
 * 240 or the controls 224, plus a 16px gap) must fit beside half the tabs
 * (197) within half the bar; below ~975px a side column overlaps the tabs.
 */
export const NAV_DESKTOP_MIN_WIDTH = 980;
export const NAV_DESKTOP = `@media (min-width:${NAV_DESKTOP_MIN_WIDTH}px)`;
export const NAV_MOBILE_QUERY = `(max-width:${NAV_DESKTOP_MIN_WIDTH - 0.05}px)`;

/** Side padding every page and the header bar share, so their edges line up at every width. */
export const PAGE_PADDING = { px: 2, [TABLET]: { px: 3 } } as const;
