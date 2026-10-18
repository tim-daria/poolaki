/** @file Phone navigation: the workspace's pages as a bar along the bottom
 * edge. On desktop the header's tabs take over. */

import { NavLink } from "react-router";
import { Box, ButtonBase, Paper } from "@mui/material";
import { NAV_ITEMS } from "./navItems";
import { TABLET } from "../../lib/layout";

/** Shell bottom bar height, without the home-indicator inset. */
export const bottomNavHeight = 64;

/**
 * Active styling comes from react-router's NavLink, which appends `.active`
 * to whatever className MUI passes down.
 */
export function BottomNav() {
  return (
    <Paper
      component="nav"
      aria-label="Workspace pages"
      square
      sx={{
        display: "flex",
        height: bottomNavHeight,
        pb: "env(safe-area-inset-bottom)",
        boxSizing: "content-box",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      {NAV_ITEMS.map((item) => (
        <ButtonBase
          aria-label={item.label}
          key={item.to}
          component={NavLink}
          to={item.to}
          end={item.end}
          sx={{
            flex: 1,
            flexDirection: "column",
            color: "text.secondary",
            [TABLET]: { gap: 0.5, fontSize: 12, fontWeight: 500 },
            "&.active": {
              color: "primary.dark",
              [TABLET]: { fontWeight: 600 },
            },
            "&.Mui-focusVisible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: -2,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              px: 2.5,
              py: 0.5,
              borderRadius: 999,
              ".active > &": { bgcolor: "primary.light" },
            }}
          >
            {item.icon}
          </Box>
          <Box
            component="span"
            sx={{ display: "none", [TABLET]: { display: "block" } }}
          >
            {item.label}
          </Box>
        </ButtonBase>
      ))}
    </Paper>
  );
}
