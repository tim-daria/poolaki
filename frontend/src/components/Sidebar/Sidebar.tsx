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
import DiscountOutlinedIcon from "@mui/icons-material/DiscountOutlined";
import { headerHeight } from "../Header/Header";
import { NavItem } from "./NavItem";

export const drawerWidth = 240;
export const miniWidth = 64;

/**
 * Relative `to` paths resolve against /o/:orgId, so every entry follows the
 * current workspace without threading orgId through props. Absolute paths
 * would escape the workspace and land on routes that do not exist.
 */
const navItems = [
  // `end` — otherwise "." matches every page under /o/:orgId and Overview
  // stays highlighted on each sub-page.
  { label: "Overview", to: ".", end: true, icon: <DashboardOutlinedIcon /> },
  { label: "Transactions", to: "transactions", icon: <SyncAltOutlinedIcon /> },
  { label: "Goals", to: "goals", icon: <FavoriteBorderIcon /> },
  { label: "Categories", to: "categories", icon: <DiscountOutlinedIcon /> },
];

/** Absolute — these sit at the app root, not under /o/:orgId. */
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

  // On mobile the drawer overlays, so it's always full width and never mini
  const showCollapsed = !isMobile && collapsed;
  const currentWidth = showCollapsed ? miniWidth : drawerWidth;

  const drawerContent = (
    <>
      {!isMobile && (
        <>
          {/* Same height as the header, with the row centred inside it, so
              "Poolaki" sits on the header label's line. The box has no border
              of its own — only the text lines up, not the two blocks. */}
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
          // Breathing room under the brand row, in place of the old divider.
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
            // The overlay covers the content it just navigated to, so it has
            // to get out of the way. The permanent drawer stays put.
            onNavigate={isMobile ? onMobileClose : undefined}
          />
        ))}
      </List>

      {/* mt: auto pins these to the bottom — the Drawer paper is a flex
          column, so the gap above absorbs the free space. */}
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
    // No top padding on desktop — the brand row is measured from the very top,
    // otherwise its text drops below the header's. Mobile has no brand row.
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
        // Keeps the nav in the DOM between opens — better first-open paint,
        // and SEO-neutral here since this is behind auth.
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
