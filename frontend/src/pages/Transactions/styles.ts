/** @file Style recipes shared by the transactions page and its filter panel. */

/**
 * Outlined button that fills with the primary tint while active. A function
 * of `active` rather than two objects, so a call site cannot pick the tinted
 * look without also saying when it applies.
 */
export function tintedWhenActive(active: boolean) {
  return {
    fontWeight: 600,
    color: active ? "primary.dark" : "text.primary",
    borderColor: active ? "primary.light" : "divider",
    bgcolor: active ? "primary.light" : "transparent",
    "&:hover": {
      borderColor: active ? "primary.light" : "divider",
      bgcolor: active ? "primary.light" : "action.hover",
    },
  } as const;
}
