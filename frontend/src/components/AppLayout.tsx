import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router";
import {
  Box,
  CircularProgress,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useLogout } from "../context/useLogout";
import { Header } from "./Header/Header";
import { Sidebar } from "./Sidebar/Sidebar";

interface AppLayoutProps {
  /** True while the backend session is catching up to the URL's workspace. */
  syncing: boolean;
}

const COLLAPSED_KEY = "sidebar:collapsed";

/**
 * Storage access is guarded: a blocked or full localStorage throws, and the
 * app shell failing to render over a cosmetic preference is not a trade worth
 * making.
 */
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Main application layout housing the persistent Header and Sidebar.
 *
 * Key behaviors:
 * - Flex shell: a permanent MUI Drawer renders its paper `position: fixed`, so
 *   the Drawer root has to reserve the column in normal flow. That is the
 *   standard MUI app-shell pattern and the reason this is flex, not grid.
 * - Lifted chrome state: `collapsed` and `mobileOpen` live here because the
 *   Header's hamburger opens a Drawer the Sidebar owns.
 * - State Reset via `key={orgId}`: Bound to `<main>`, changing `orgId` forces React
 *   to remount only the page content (<Outlet />), automatically clearing old filters,
 *   scroll position, and stale data while keeping the shell UI mounted smoothly.
 */
export function AppLayout() {
  const logout = useLogout();
  const { orgId } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  // Lazy initialiser — reads storage once on mount, not on every render.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // Preference is not worth surfacing an error over.
    }
  }, [collapsed]);

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100%" }}>
      <Sidebar
        isMobile={isMobile}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
        }}
      >
        <Header
          onLogout={logout}
          onMenuClick={() => setMobileOpen(true)}
          showMenuButton={isMobile}
        />

        <Box component="main" key={orgId} sx={{ flex: 1, overflowY: "auto" }}>
          {/* Content column, centred once the viewport outgrows it. Wraps
               the page header too, so heading and page stay on one edge. */}
          <Box sx={{ maxWidth: contentMaxWidth, mx: "auto" }}>
            <PageHeader>
              <Outlet />
            </PageHeader>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
