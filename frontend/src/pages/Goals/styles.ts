/**
 * @file Shared sx for the Goals page. A separate module, not an export from a
 * component file: react-refresh/only-export-components forbids the latter.
 */

/** The clickable card frame shared by GoalCard and NewGoalCard: padding, radius, hover and focus ring. */
export const cardFrameSx = {
  p: 2.5,
  display: "flex",
  flexDirection: "column",
  gap: 1,
  borderRadius: 3,
  cursor: "pointer",
  "&:hover": { borderColor: "primary.main" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
} as const;
