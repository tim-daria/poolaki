import { useEffect, useRef, useState } from "react";
import { AiChatDrawer } from "./AiChat/AiChatDrawer";
import { Outlet, useParams, Link as RouterLink } from "react-router";
import { Box, Link, useMediaQuery, useTheme } from "@mui/material";
import { useLogout } from "../context/useLogout";
import { useRouteMeta } from "../routeMeta";
import { Header } from "./Header/Header";
import { PageHeader } from "./PageHeader/PageHeader";
import { BottomNav } from "./BottomNav/BottomNav";
import { LEGAL_LINKS, NAV_MOBILE_QUERY } from "./BottomNav/navItems";
import { useScrollingDown } from "../hooks/useScrollingDown";

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
 * - State reset via `key={orgId}`: bound to `<main>`, changing `orgId` forces
 *   React to remount only the page content (<Outlet />), clearing old
 *   filters and stale data while the shell stays mounted. The shell column
 *   is the scroll container (so the header scrolls away with the page and
 *   a scrollbar narrows header and page alike), and it is not keyed, so an
 *   effect scrolls it back to the top on the same change.
 *   The chat panel is keyed the same way so a conversation never outlives
 *   the organisation it was about.
 * - The AI assistant is a sibling of the whole shell (header + page), not
 *   of <main> alone: on desktop it pushes the entire page aside and runs the
 *   full viewport height; on phones it covers the shell, which is marked
 *   `inert` so focus and assistive tech stay inside the panel without any
 *   `aria-hidden` juggling.
 */
export function AppLayout() {
  const logout = useLogout();
  const theme = useTheme();
  const { orgId } = useParams();
  const narrow = useRouteMeta()?.width === "narrow";
  const showAssistant = useRouteMeta()?.assistant ?? true;
  const isMobile = useMediaQuery(NAV_MOBILE_QUERY);
  const chatFullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [chatOpen, setChatOpen] = useState(false);
  const [fabSlot, setFabSlot] = useState<HTMLElement | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    shellRef.current?.scrollTo({ top: 0 });
  }, [orgId]);

  const fabCollapsed = useScrollingDown(shellRef);

  return (
    <Box
      sx={{
        display: "flex",
        // dvh, not vh: on iOS the collapsing address bar would otherwise
        // leave the chat input behind the browser chrome.
        height: "100dvh",
        width: "100%",
        bgcolor: "primary.light",
      }}
    >
      {/* App shell: header stacked over the page, scrolling as one. */}
      <Box
        ref={shellRef}
        inert={chatOpen && chatFullScreen}
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          // Let the chat column take its width from here, not overflow.
          minWidth: 0,
          overflowY: "auto",
        }}
      >
        {/* Same column, side padding and scroll container as the page, so the
            bar's edges line up with the cards below it at every width, with
            or without a scrollbar, and it scrolls away with them. */}
        <Box
          sx={{
            width: "100%",
            // Always the full column: a narrow page narrows its content, not
            // the bar, which needs the room for switcher, tabs and controls.
            maxWidth: contentMaxWidth,
            mx: "auto",
            // Switches at 600px like the pages (Home's TABLET breakpoint).
            px: { xs: 2, sm: 3 },
            pt: 2,
          }}
        >
          <Header
            onLogout={logout}
            onAssistantClick={() => setChatOpen(true)}
            showAssistant={showAssistant}
            showTabs={!isMobile}
          />
        </Box>

        <Box component="main" key={orgId} sx={{ flex: 1 }}>
          {/* Content column, centred once the viewport outgrows it. Wraps
              the page header too, so heading and page stay on one edge. */}
          <Box
            sx={{
              maxWidth: narrow ? narrowContentMaxWidth : contentMaxWidth,
              mx: "auto",
            }}
          >
            <PageHeader fabSlot={isMobile ? fabSlot : null}>
              <Outlet />
            </PageHeader>
          </Box>

          {/* Below the page on every size; the bottom bar does not carry them. */}
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
        </Box>
        {isMobile && (
          <Box sx={{ position: "sticky", bottom: 0, zIndex: "appBar" }}>
            {/* Anchored to the bar, so it rides above it whatever the safe-area
        inset adds below. */}
            <Box
              ref={setFabSlot}
              data-collapsed={fabCollapsed || undefined}
              sx={{
                position: "absolute",
                right: 16,
                bottom: "calc(100% + 16px)",
              }}
            />
            <BottomNav />
          </Box>
        )}
      </Box>

      <AiChatDrawer
        key={orgId}
        open={chatOpen}
        fullScreen={chatFullScreen}
        onClose={() => setChatOpen(false)}
      />
    </Box>
  );
}
