/** @file Shared sx for the Settings pages, split out so the component files export components only. */

/** Width comes from the route (`width: "narrow"`), which also caps the header. */
export const settingsColumnSx = {
  px: 3,
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
