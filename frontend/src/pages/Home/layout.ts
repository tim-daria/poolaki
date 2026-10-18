/**
 * @file Overview page breakpoints. A separate module so components and the
 * page agree on where the desktop layout begins.
 */

/** Below this the page is the phone layout: one column, smaller figures, folded rows. */
export const DESKTOP_MIN_WIDTH = 820;
export const DESKTOP = `@media (min-width:${DESKTOP_MIN_WIDTH}px)`;
export const DESKTOP_QUERY = `(min-width:${DESKTOP_MIN_WIDTH}px)`;

/** Card padding shared by every Overview card and the top card's halves. */
export const CARD_PADDING = { xs: 2.5, sm: 3 } as const;

/**
 * A clickable card: the same ring on hover and outline on focus as the
 * Savings cards, and the header cue (HomeCardAction) darkens with the card.
 */
export const cardLinkSx = {
  cursor: "pointer",
  textDecoration: "none",
  color: "inherit",
  "&:hover": { boxShadow: "0 0 0 1px var(--mui-palette-primary-main)" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
  "&:hover .HomeCard-action, &:focus-visible .HomeCard-action": {
    color: "text.primary",
  },
} as const;
