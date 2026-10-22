/**
 * @file App shell header: budget switcher, page tabs, notifications and the
 * account menu on one bar that aligns with the page's cards.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  useTheme,
} from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { useAuth } from "../../context/useAuth";
import { useNotifications } from "../../context/useNotifications";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { NAV_DESKTOP, PRINT } from "../../lib/layout";
import { NavTabs } from "./NavTabs";
import { OrgSwitcher } from "./OrgSwitcher";
import { NotificationPanel } from "./NotificationPanel";
import { initials } from "../../lib/initials";
import { avatarColor } from "../../lib/avatarColor";

/** Shell header height. */
const headerHeight = 72;

/**
 * One footprint for every round control on the bar, so the notification and
 * account buttons share a hit area and sit on the same optical line. Their
 * contents differ in size on purpose: a filled avatar disc reads heavier than
 * an outline glyph, so matching them pixel-for-pixel makes the avatar dominate.
 */
const controlSx = { width: 52, height: 52 } as const;
const avatarSize = 38;
const glyphSize = 28;

interface HeaderProps {
  onLogout: () => void;
  /** Opens AI Assistant chat. */
  onAssistantClick: () => void;
  /** Routes can turn AI button off via `handle.assistant`. */
  showAssistant: boolean;
  /** Mobile: bottom bar instead of tabs and the bell inside the avatar menu. */
  mobile: boolean;
}

/**
 * On desktop a three-column grid whose side columns are equal, so the tabs
 * sit on the page's centre line whatever the switcher and the controls
 * measure; `minmax(0, 1fr)` lets a long budget name truncate instead of
 * pushing into the tabs. On phones a plain row: switcher, controls.
 */
export function Header({
  onLogout,
  onAssistantClick,
  showAssistant,
  mobile,
}: HeaderProps) {
  const { user } = useAuth();
  const org = useCurrentOrg();
  const navigate = useNavigate();
  const theme = useTheme();
  const { unreadCount } = useNotifications();
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  const closeAccount = () => setAccountAnchor(null);
  const initial = initials(user?.username);

  return (
    <Paper
      component="header"
      id="header"
      variant="card"
      sx={{
        height: headerHeight,
        py: 0,
        px: "20px",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        [NAV_DESKTOP]: {
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          gap: 2,
        },
        [PRINT]: { display: "none" },
      }}
    >
      {/* Phones: the switcher keeps to half the bar, so the controls on the
          right never get squeezed by a long workspace name. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 0,
          maxWidth: "50%",
          [NAV_DESKTOP]: { justifySelf: "start", maxWidth: "none" },
        }}
      >
        <OrgSwitcher />
      </Box>

      {!mobile && <NavTabs />}

      <Stack
        direction="row"
        spacing={0}
        sx={{
          alignItems: "center",
          ml: "auto",
          [NAV_DESKTOP]: { ml: 0, justifySelf: "end" },
        }}
      >
        {showAssistant &&
          (mobile ? (
            <IconButton
              aria-label="Ask AI"
              onClick={onAssistantClick}
              // No margin, like the bell beside the avatar on desktop: the
              // two controls' insets around their discs are the gap.
              sx={controlSx}
            >
              {/* The ring matches the avatar disc, not the hit area, so the
                  two read as the same size. */}
              <Box
                sx={{
                  width: avatarSize,
                  height: avatarSize,
                  // A flex child of the padded button; without this it
                  // shrinks to the button's content box.
                  flexShrink: 0,
                  borderRadius: "50%",
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.primary",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <AutoAwesomeOutlinedIcon fontSize="small" />
              </Box>
            </IconButton>
          ) : (
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeOutlinedIcon />}
              onClick={onAssistantClick}
              // Full primary border; the outlined default is half-alpha.
              sx={{ mr: 1.5, fontWeight: 700, borderColor: "primary.main" }}
            >
              Ask AI
            </Button>
          ))}
        {!mobile && (
          <IconButton
            aria-label="Notifications"
            // Not "menu": the panel is an inbox of content with per-row
            // actions, not a list of commands. See NotificationPanel.
            aria-haspopup="dialog"
            aria-expanded={Boolean(notifAnchor)}
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            sx={controlSx}
          >
            <Badge color="error" variant="dot" invisible={unreadCount === 0}>
              <NotificationsNoneIcon sx={{ fontSize: glyphSize }} />
            </Badge>
          </IconButton>
        )}

        <NotificationPanel
          anchorEl={notifAnchor}
          onClose={() => setNotifAnchor(null)}
        />

        {/* Deliberately not "Account: <username>" — the personal workspace
            is named after the user, so that would collide with the
            OrgSwitcher's accessible name. */}
        <IconButton
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={Boolean(accountAnchor)}
          onClick={(e) => setAccountAnchor(e.currentTarget)}
          sx={controlSx}
        >
          <Badge
            color="error"
            variant="dot"
            overlap="circular"
            invisible={!mobile || unreadCount === 0}
          >
            <Avatar
              sx={{
                width: avatarSize,
                height: avatarSize,
                fontSize: "1.1rem",
                fontWeight: 600,
                bgcolor: avatarColor(user?.username, theme.palette.avatar),
              }}
            >
              {initial}
            </Avatar>
          </Badge>
        </IconButton>

        <Menu
          anchorEl={accountAnchor}
          open={Boolean(accountAnchor)}
          onClose={closeAccount}
          slotProps={{ paper: { sx: { minWidth: 200 } } }}
        >
          {/* Identity, not a command: a Box so it is neither focusable nor
              announced as a disabled item. Padding matches MenuItem. */}
          {user && (
            <Box sx={{ px: 2, py: 0.75 }}>
              <ListItemText
                primary={user.username}
                secondary={user.email}
                slotProps={{
                  primary: { sx: { fontWeight: 600 } },
                  secondary: { noWrap: true },
                }}
              />
            </Box>
          )}
          {user && <Divider />}

          {mobile && (
            <MenuItem
              onClick={() => {
                // Anchor the inbox to the avatar, where the menu was.
                setNotifAnchor(accountAnchor);
                closeAccount();
              }}
            >
              <ListItemIcon>
                <Badge
                  color="error"
                  variant="dot"
                  invisible={unreadCount === 0}
                >
                  <NotificationsNoneIcon fontSize="small" />
                </Badge>
              </ListItemIcon>
              <ListItemText>Notifications</ListItemText>
            </MenuItem>
          )}

          {/* Scoped under the current workspace because the shell around
              the page needs one; the settings themselves are account-wide. */}
          <MenuItem
            onClick={() => {
              closeAccount();
              navigate(`/o/${org.id}/settings`);
            }}
          >
            <ListItemIcon>
              <SettingsOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>

          <Divider />

          <MenuItem
            onClick={() => {
              closeAccount();
              onLogout();
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Stack>
    </Paper>
  );
}
