import { Menu, MenuItem, Typography, Button, Divider, Box } from "@mui/material";
import { useNotifications } from "../../context/useNotifications";

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function NotificationPanel({ anchorEl, onClose }: NotificationPanelProps) {
  const { notifications, clearAll } = useNotifications();

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 320 } } }}
    >
      {sorted.length === 0 && (
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            No new notifications
          </Typography>
        </MenuItem>
      )}

      {sorted.map((n) => (
        <MenuItem key={n.id} disabled sx={{ opacity: "1 !important" }}>
          <Typography variant="body2">
            {n.type === "invitation" && "invited_by" in n.payload
              ? `${n.payload.invited_by} invited you to ${n.org_name}`
              : "Notification"}
          </Typography>
        </MenuItem>
      ))}

      {sorted.length > 0 && (
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