import { useState } from "react";
import { AiChatDrawer } from "./AiChat/AiChatDrawer";
import { Outlet, useParams, Link as RouterLink } from "react-router";
import { Box, Link, useMediaQuery } from "@mui/material";
import { useLogout } from "../context/useLogout";
import { useRouteMeta } from "../routeMeta";
import { Header } from "./Header/Header";
import { PageHeader } from "./PageHeader/PageHeader";
import { Sidebar } from "./Sidebar/Sidebar";
import { LEGAL_LINKS, NAV_MOBILE_QUERY } from "./navItems";

/**
 * Ceiling for the page column. Past this the content centres instead of
 * stretching: dashboard cards and table rows get unreadably wide on a large
 * monitor, and the eye loses the line on the way back to the left edge.
 */
const contentMaxWidth = 1280;

/** For pages of stacked label-and-button rows, which read badly stretched. */
const narrowContentMaxWidth = 880;

/**
 * Main application layout: the Header with the page tabs, and the page area.
 *
 * - On phones the tabs give way to a hamburger that opens the Sidebar's
 *   overlay drawer; `mobileOpen` lives here because the Header opens what the
 *   Sidebar owns.
 * - State reset via `key={orgId}`: bound to `<main>`, changing `orgId` forces
 *   React to remount only the page content (<Outlet />), clearing old
 *   filters, scroll position and stale data while the shell stays mounted.
 */
export function AppLayout() {
  const logout = useLogout();
  const { orgId } = useParams();
  const narrow = useRouteMeta()?.width === "narrow";
  const isMobile = useMediaQuery(NAV_MOBILE_QUERY);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
      }}
    >
      {isMobile && (
        <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      )}

      {/* Same column and side padding as the page, so the bar's edges line
          up with the cards below it. */}
      <Box
        sx={{
          width: "100%",
          maxWidth: narrow ? narrowContentMaxWidth : contentMaxWidth,
          mx: "auto",
          px: { xs: 2, md: 3 },
          pt: 2,
        }}
      >
        <Header
          onLogout={logout}
          onMenuClick={() => setMobileOpen(true)}
          showMenuButton={isMobile}
        />
      </Box>

      <Box component="main" key={orgId} sx={{ flex: 1, overflowY: "auto" }}>
        {/* Content column, centred once the viewport outgrows it. Wraps
             the page header too, so heading and page stay on one edge. */}
        <Box
          sx={{
            maxWidth: narrow ? narrowContentMaxWidth : contentMaxWidth,
            mx: "auto",
          }}
        >
          <PageHeader onAssistantClick={() => setChatOpen(true)}>
            <Outlet />
          </PageHeader>
        </Box>

        {/* Below the page on every size; the drawer does not carry them. */}
        {
          <Box
            component="footer"
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              py: 2,
            }}
          >
            {LEGAL_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                component={RouterLink}
                to={to}
                underline="hover"
                sx={{ fontSize: "0.75rem", color: "text.secondary" }}
              >
                {label}
              </Link>
            ))}
          </Box>
        }
      </Box>
      <AiChatDrawer
        key={orgId}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </Box>
  );
}
