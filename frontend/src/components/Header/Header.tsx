import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Stack,
  IconButton,
  Badge,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { useAuth } from "../../context/useAuth";
import { useNotifications } from "../../context/useNotifications";
import { OrgSwitcher } from "./OrgSwitcher";
import { NotificationPanel } from "./NotificationPanel";
import { initials } from "../../lib/initials";
import { avatarColor } from "../../lib/avatarColor";

/** Shell header height. Deliberately taller than the Sidebar's brand row. */
export const headerHeight = 72;

/**
 * One footprint for every round control on the bar, so the notification and
 * account buttons share a hit area and sit on the same optical line. Their
 * contents differ in size on purpose: a filled avatar disc reads heavier than
 * an outline glyph, so matching them pixel-for-pixel makes the avatar dominate.
 */
const controlSize = 52;
const avatarSize = 38;
const glyphSize = 28;

interface HeaderProps {
  onLogout: () => void;
  /** Opens the Sidebar's temporary Drawer; only reachable on mobile. */
  onMenuClick: () => void;
  showMenuButton: boolean;
}

/**
 * App shell header. `position="static"` because it sits in AppLayout's flex
 * content column, beside the Sidebar rather than over it.
 *
 * The OrgSwitcher sits in the left slot; notifications and the account menu
 * are pushed to the right.
 */
export function Header({ onLogout, onMenuClick, showMenuButton }: HeaderProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const { unreadCount, markAllAsRead } = useNotifications();
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  const closeAccount = () => setAccountAnchor(null);
  const initial = initials(user?.username);

  return (
    <AppBar
      id="header"
      position="static"
      color="inherit"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: headerHeight, gap: 1.5 }}>
        {showMenuButton && (
          <IconButton
            aria-label="Open navigation"
            edge="start"
            onClick={onMenuClick}
          >
            <MenuIcon />
          </IconButton>
        )}

        <OrgSwitcher />

        {/* ml: auto pushes the remaining controls to the right edge. */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", ml: "auto" }}
        >
          <IconButton
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={Boolean(notifAnchor)}
            onClick={(e) => {
              setNotifAnchor(e.currentTarget);
              markAllAsRead();
            }}
            sx={{ width: controlSize, height: controlSize }}
          >
            <Badge color="error" variant="dot" invisible={unreadCount === 0}>
              <NotificationsNoneIcon sx={{ fontSize: glyphSize }} />
            </Badge>
          </IconButton>

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
            sx={{ width: controlSize, height: controlSize }}
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
          </IconButton>

          <Menu
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={closeAccount}
            slotProps={{ paper: { sx: { minWidth: 200 } } }}
          >
            {user && (
              <MenuItem disabled sx={{ opacity: "1 !important" }}>
                <ListItemText
                  primary={user.username}
                  secondary={user.email}
                  slotProps={{
                    primary: { sx: { fontWeight: 600 } },
                    secondary: { noWrap: true },
                  }}
                />
              </MenuItem>
            )}
            {user && <Divider />}

            {/* Placeholders until the pages exist — disabled rather than
                dead-clickable, so the menu doesn't lie about what works. */}
            <MenuItem disabled onClick={closeAccount}>
              <ListItemIcon>
                <PersonOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Account</ListItemText>
            </MenuItem>

            <MenuItem disabled onClick={closeAccount}>
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
      </Toolbar>
    </AppBar>
  );
}
