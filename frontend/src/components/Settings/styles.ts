/** @file Shared sx for the Settings pages, split out so the component files export components only. */

import { PAGE_PADDING } from "../../lib/layout";

/** Width comes from the route (`width: "narrow"`), which also caps the header. */
export const settingsColumnSx = {
  ...PAGE_PADDING,
  pb: 5,
  display: "flex",
  flexDirection: "column",
  gap: 2.5,
} as const;

export const outlinedActionSx = {
  bgcolor: "background.paper",
  borderColor: "divider",
  color: "text.primary",
  fontWeight: 600,
} as const;
