/** @file Desktop navigation: the workspace's pages as text tabs in the header. */

import { NavLink } from "react-router";
import { Box, ButtonBase } from "@mui/material";
import { NAV_ITEMS } from "../navItems";

/**
 * Active styling comes from react-router's NavLink, which appends `.active`
 * to whatever className MUI passes down.
 */
export function NavTabs() {
  return (
    <Box
      component="nav"
      aria-label="Workspace pages"
      sx={{ display: "flex", gap: "4px", minWidth: 0 }}
    >
      {NAV_ITEMS.map((item) => (
        <ButtonBase
          key={item.to}
          component={NavLink}
          to={item.to}
          end={item.end}
          sx={{
            padding: "9px 16px",
            borderRadius: "12px",
            fontSize: 15,
            fontWeight: 500,
            color: "text.secondary",
            whiteSpace: "nowrap",
            "&:hover": { bgcolor: "action.hover", color: "text.primary" },
            "&.active": {
              bgcolor: "primary.light",
              color: "primary.dark",
              fontWeight: 600,
            },
            "&.Mui-focusVisible": {
              outline: "2px solid",
              outlineColor: "primary.main",
            },
          }}
        >
          {item.label}
        </ButtonBase>
      ))}
    </Box>
  );
}
