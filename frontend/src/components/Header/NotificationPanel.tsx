import { Menu, MenuItem, Typography, Button, Divider, Box } from "@mui/material";
import { useNotifications } from "../../context/useNotifications";

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function NotificationPanel({ anchorEl, onClose }: NotificationPanelProps) {
  const { notifications, clearAll } = useNotifications();

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 320 } } }}
    >
      {notifications.length === 0 && (
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            No new notifications
          </Typography>
        </MenuItem>
      )}

      {notifications.map((n) => (
        <MenuItem key={n.id} disabled sx={{ opacity: "1 !important" }}>
          <Typography variant="body2">
            {n.invited_by ? `${n.invited_by} invited you to ${n.org_name}` : "Notification"}
          </Typography>
        </MenuItem>
      ))}

      {notifications.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Button size="small" onClick={() => { clearAll(); onClose(); }}>
              Clear all
            </Button>
          </Box>
        </>
      )}
    </Menu>
  );
}