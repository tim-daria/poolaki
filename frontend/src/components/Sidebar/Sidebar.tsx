/** @file Workspace navigation drawer: permanent and collapsible on desktop, overlay on mobile. */

import { Link as RouterLink } from "react-router";
import {
  Box,
  Drawer,
  Link,
  List,
  ListItemButton,
  Typography,
  useTheme,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import SyncAltOutlinedIcon from "@mui/icons-material/SyncAltOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { headerHeight } from "../Header/Header";
import { NavItem } from "./NavItem";

export const drawerWidth = 240;
export const miniWidth = 64;

/** Paths are relative so they resolve against /o/:orgId without threading orgId through props. */
const navItems = [
  // `end` stops "." from matching every route under /o/:orgId.
  { label: "Home", to: ".", end: true, icon: <DashboardOutlinedIcon /> },
  { label: "Transactions", to: "transactions", icon: <SyncAltOutlinedIcon /> },
  { label: "Goals", to: "goals", icon: <FavoriteBorderIcon /> },
];

/** Absolute paths: these live at the app root, not under /o/:orgId. */
const LEGAL_LINKS = [
  { to: "/terms", label: "Terms" },
  { to: "/policy", label: "Policy" },
];

interface SidebarProps {
  isMobile: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  isMobile,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const theme = useTheme();

  // The mobile overlay is always full width; only the desktop drawer collapses.
  const showCollapsed = !isMobile && collapsed;
  const currentWidth = showCollapsed ? miniWidth : drawerWidth;

  const drawerContent = (
    <>
      {!isMobile && (
        <>
          {/* Matches headerHeight so the brand text aligns with the header label. */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: headerHeight,
            }}
          >
            <ListItemButton
              onClick={onToggleCollapsed}
              aria-label={
                collapsed ? "Expand navigation" : "Collapse navigation"
              }
              aria-expanded={!collapsed}
              sx={{
                justifyContent: showCollapsed ? "center" : "space-between",
                alignItems: "center",
                color: "text.secondary",
                borderRadius: 1,
                px: showCollapsed ? 1.5 : 3,
                gap: 1,
              }}
            >
              {showCollapsed ? (
                <ChevronRightIcon />
              ) : (
                <>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color: "primary.contrastText",
                    }}
                  >
                    Poolaki
                  </Typography>
                  <ChevronLeftIcon />
                </>
              )}
            </ListItemButton>
          </Box>
        </>
      )}

      <List
        sx={{
          mt: 3,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          p: 0,
          pr: showCollapsed ? 0 : 1.5,
        }}
      >
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={showCollapsed}
            // The overlay must close after navigating; the permanent drawer stays open.
            onNavigate={isMobile ? onMobileClose : undefined}
          />
        ))}
      </List>

      {/* Drawer paper is a flex column, so mt: auto pins the links to the bottom. */}
      <Box
        sx={{
          mt: "auto",
          pt: 2,
          px: showCollapsed ? 1 : 3,
          display: "flex",
          flexDirection: showCollapsed ? "column" : "row",
          alignItems: "center",
          justifyContent: showCollapsed ? "center" : "flex-start",
          gap: showCollapsed ? 0.5 : 1.5,
        }}
      >
        {LEGAL_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            component={RouterLink}
            to={to}
            onClick={isMobile ? onMobileClose : undefined}
            underline="hover"
            sx={{
              fontSize: showCollapsed ? "0.65rem" : "0.75rem",
              color: "rgba(255, 255, 255, 0.6)",
              "&:hover": { color: "primary.contrastText" },
            }}
          >
            {label}
          </Link>
        ))}
      </Box>
    </>
  );

  const paperSx = {
    width: currentWidth,
    boxSizing: "border-box",
    bgcolor: "primary.dark",
    borderRight: 1,
    borderColor: "divider",
    // Desktop: brand row height is measured from the top edge to align with the header.
    pt: isMobile ? 1 : 0,
    pb: 1,
    overflowX: "hidden",
    transition: theme.transitions.create("width"),
  } as const;

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        // Avoids a blank first-open paint.
        slotProps={{ root: { keepMounted: true } }}
        sx={{
          "& .MuiDrawer-paper": { ...paperSx, width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: currentWidth,
        flexShrink: 0,
        transition: theme.transitions.create("width"),
        "& .MuiDrawer-paper": paperSx,
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
