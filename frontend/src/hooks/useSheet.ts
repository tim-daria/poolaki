/** @file Side drawers and form modals become bottom sheets on phones: the anchor and paper shape for a Drawer. */

import { useMediaQuery } from "@mui/material";
import { NAV_MOBILE_QUERY } from "../lib/layout";

/**
 * Every sheet's height on a phone or tablet: tall enough for a list, with
 * the page still showing behind, as a modal sheet should.
 */
const SHEET_HEIGHT = "85dvh";

/**
 * Corner radius as a multiple of `theme.shape.borderRadius`, the same radius
 * the MuiDialog paper override gives a dialog. sx resolves it through the
 * theme; the per-corner longhands after it square the edge corners.
 */
const CORNER = 2;

/**
 * The sheet half of the rule: whether the viewport is below the nav
 * breakpoint, where the bottom bar replaces the header tabs, and the paper
 * shape of a bottom-anchored Drawer there. Spread `paperSx` into the Drawer's
 * paper slot. ModalShell uses it directly: above the breakpoint it is a
 * centred Dialog, not a side drawer.
 *
 * A sheet fills SHEET_HEIGHT and scrolls inside it (open-ended content: the
 * chat). With `fit` it is as tall as its content and SHEET_HEIGHT is only
 * the cap (a form or a bounded list: filters, goal info). Nothing resizes by
 * hand. docs/frontend/drawers.md has the reasoning.
 */
export function useBottomSheet(fit = false) {
  const sheet = useMediaQuery(NAV_MOBILE_QUERY);
  return {
    sheet,
    paperSx: {
      ...(fit
        ? { height: "auto", maxHeight: SHEET_HEIGHT }
        : { height: SHEET_HEIGHT }),
      borderRadius: CORNER,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
  } as const;
}

/**
 * Below the nav breakpoint a drawer is a bottom sheet (`useBottomSheet`);
 * from there on it slides in from the right at `width`. Spread `paperSx`
 * into the Drawer's paper slot.
 */
export function useSheet(width: number, fit = false) {
  const { sheet, paperSx } = useBottomSheet(fit);
  return {
    sheet,
    anchor: sheet ? "bottom" : "right",
    paperSx: sheet
      ? paperSx
      : // The two corners facing the page, like a sheet's top corners.
        {
          width,
          borderRadius: CORNER,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        },
  } as const;
}
