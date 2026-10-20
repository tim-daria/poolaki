/** @file Side drawers become bottom sheets on phones: the anchor and paper shape for a Drawer. */

import { useMediaQuery } from "@mui/material";
import { NAV_MOBILE_QUERY } from "../lib/layout";

/**
 * Every sheet's height on a phone or tablet: tall enough for a list, with
 * the page still showing behind, as a modal sheet should.
 */
const SHEET_HEIGHT = "85dvh";

/**
 * Below the nav breakpoint, where the bottom bar replaces the header tabs,
 * a drawer slides up from the bottom; from there on it slides in from the
 * right at `width`. Spread `paperSx` into the Drawer's paper slot.
 *
 * A sheet fills SHEET_HEIGHT and scrolls inside it (open-ended content: the
 * chat). With `fit` it is as tall as its content and SHEET_HEIGHT is only
 * the cap (a form or a bounded list: filters, goal info). Nothing resizes by
 * hand. docs/frontend/drawers.md has the reasoning.
 */
export function useSheet(width: number, fit = false) {
  const sheet = useMediaQuery(NAV_MOBILE_QUERY);
  return {
    anchor: sheet ? "bottom" : "right",
    paperSx: sheet
      ? {
          ...(fit
            ? { height: "auto", maxHeight: SHEET_HEIGHT }
            : { height: SHEET_HEIGHT }),
          borderRadius: "16px 16px 0 0",
        }
      : // The two corners facing the page, like a sheet's top corners.
        { width, borderRadius: "16px 0 0 16px" },
  } as const;
}
