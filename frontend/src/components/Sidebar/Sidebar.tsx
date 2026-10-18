/** @file Phone navigation: the workspace's pages in an overlay drawer. On desktop the header's tabs take over. */

import { Drawer, List, Typography } from "@mui/material";
import { NAV_ITEMS } from "../navItems";
import { NavItem } from "./NavItem";

export const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      // Avoids a blank first-open paint.
      slotProps={{ root: { keepMounted: true } }}
      sx={{
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "primary.dark",
          pt: 1,
          pb: 1,
        },
      }}
    >
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: "1.1rem",
          color: "primary.contrastText",
          px: 3,
          py: 1.5,
        }}
      >
        Poolaki
      </Typography>

      <List
        sx={{
          mt: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          p: 0,
          pr: 1.5,
        }}
      >
        {NAV_ITEMS.map((item) => (
          // The overlay closes after navigating.
          <NavItem key={item.to} {...item} onNavigate={onClose} />
        ))}
      </List>
    </Drawer>
  );
}
