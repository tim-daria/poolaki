import type { ReactNode } from "react";
import { NavLink } from "react-router";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";

interface NavItemProps {
  /** Relative — resolves against /o/:orgId. */
  to: string;
  label: string;
  icon: ReactNode;
  /** Match this path exactly; needed for the index route. */
  end?: boolean;
  /** Fired after navigating — closes the overlay drawer on mobile. */
  onNavigate?: () => void;
}

/**
 * One sidebar link. Active styling comes from react-router's NavLink, which
 * appends `.active` to whatever className MUI passes down.
 */
export function NavItem({ to, label, icon, end, onNavigate }: NavItemProps) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        component={NavLink}
        to={to}
        end={end}
        onClick={onNavigate}
        sx={{
          // Pill that bleeds off the left edge, closed on the right.
          borderRadius: "0 10px 10px 0",
          px: 3,
          py: 0.75,
          // #root sets `text-align: center`, which the list inherits.
          textAlign: "left",
          color: "rgba(255, 255, 255, 0.7)",
          "&:hover": { bgcolor: "primary.main" },
          "&.active": {
            bgcolor: "primary.main",
            color: "primary.contrastText",
          },
        }}
      >
        <ListItemIcon
          sx={{
            // `inherit` so the icon follows the hover and active colors.
            color: "inherit",
            minWidth: 0,
            mr: 2,
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          slotProps={{
            primary: { sx: { fontSize: "0.9rem", fontWeight: 500 } },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}
