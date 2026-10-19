/** @file Side drawers become bottom sheets on phones: the anchor and paper shape for a Drawer. */

import { useMediaQuery } from "@mui/material";
import { NAV_MOBILE_QUERY } from "../lib/layout";

/** Tall enough for a list, with the page still showing behind. */
const SHEET_HEIGHT = "85dvh";

/**
 * Below the nav breakpoint, where the bottom bar replaces the header tabs,
 * a drawer slides up from the bottom; from there on it slides in from the
 * right at `width`. Spread `paperSx` into the Drawer's paper slot.
 * `sheetHeight` is the sheet's share of the viewport, in dvh.
 */
export function useSheet(width: number, sheetHeight = SHEET_HEIGHT) {
  const sheet = useMediaQuery(NAV_MOBILE_QUERY);
  return {
    anchor: sheet ? "bottom" : "right",
    paperSx: sheet
      ? { height: sheetHeight, borderRadius: "16px 16px 0 0" }
      : { width },
  } as const;
}
