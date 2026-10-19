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
