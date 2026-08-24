import { useState, useMemo, useEffect } from "react";
import { Menu, Typography, Button, Box, Avatar, Paper, Chip, Stack, useTheme } from "@mui/material";
import { useNotifications } from "../../context/useNotifications";
import { getCsrfToken } from "../../lib/csrf";
import { initials } from "../../lib/initials";
import { avatarColor } from "../../lib/avatarColor";

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

export function NotificationPanel({ anchorEl, onClose }: NotificationPanelProps) {
  const theme = useTheme();
  const { notifications, clearAll, loadFullList } = useNotifications();
  const [filter, setFilter] = useState<"all" | "invitations">("all");

  useEffect(() => {
    if (anchorEl) {
      loadFullList();
    }
  }, [anchorEl, loadFullList]);

  const invitationsCount = useMemo(() => {
    return notifications.filter((n) => n.type === "invitation" && !n.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "invitations") {
      return notifications.filter((n) => n.type === "invitation" && !n.is_read);
    }
    return notifications.filter(
    (n) => !(n.type === "invitation" && n.is_read)
  );
  }, [notifications, filter]);

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 380, borderRadius: 3, p: 2,boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.12)" }, }, }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          All notifications
        </Typography>
      </Box>

      {/* Controls: Filter Pills & Mark All as Read */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box
          sx={{
            bgcolor: "background.default",
            borderRadius: "20px",
            p: "3px",
            display: "inline-flex",
            gap: 0.5,
          }}
        >
          <Chip
            label="All"
            size="small"
            onClick={() => setFilter("all")}
            sx={{
              bgcolor: filter === "all" ? "primary.dark" : "transparent",
              color: filter === "all" ? "#fff" : "text.secondary",
              fontWeight: 600,
              fontSize: "0.75rem",
              "&:hover": {
                bgcolor: filter === "all" ? "#3A3549" : "rgba(0,0,0,0.05)",
              },
            }}
          />
          <Chip
            label={`Invitations (${invitationsCount})`}
            size="small"
            onClick={() => setFilter("invitations")}
            sx={{
              bgcolor: filter === "invitations" ? "primary.dark" : "transparent",
              color: filter === "invitations" ? "#fff" : "text.secondary",
              fontWeight: 600,
              fontSize: "0.75rem",
              "&:hover": {bgcolor: filter === "invitations" ? "#3A3549" : "rgba(0,0,0,0.05)",},
            }}
          />
        </Box>

        <Button
          variant="text"
          size="small"
          onClick={() => {
            const token = getCsrfToken();
            clearAll(token);
            onClose();
          }}
          sx={{
            color: "primary.dark",
            fontWeight: 600,
            fontSize: "0.8rem",
            "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
          }}
        >
          Mark all as read
        </Button>
      </Box>

      {/* Notification List */}
      <Stack spacing={1}>
        {filteredNotifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
            No notifications to display
          </Typography>
        ) : (
          filteredNotifications.map((n) => {
            const isInvitation = n.type === "invitation";
            const payload = n.payload;
            const userName = typeof payload.invited_by === "string" ? payload.invited_by : "User";
            const orgName = "org_name" in payload ? (payload.org_name as string) : "";

            return (
              <Paper
                key={n.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: isInvitation ? "action.hover" : "transparent",
                  borderBottom: isInvitation ? "none" : "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      fontSize: "0.85rem",
                      bgcolor: avatarColor(userName, theme.palette.avatar),
                    }}
                  >
                    {initials(userName)}
                  </Avatar>

                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                        {userName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                        {new Date(n.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.825rem", mt: 0.2 }}>
                      {isInvitation
                        ? `Invited you to ${orgName} workspace`
                        : "Performed an action"}
                    </Typography>

                    {/* Inline Invitation Actions */}
                    {isInvitation && (
                      <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{
                            borderRadius: "16px",
                            borderColor: "divider",
                            color: "text.primary",
                            px: 2,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        >
                          Decline
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            borderRadius: "16px",
                            bgcolor: "primary.dark",
                            px: 2,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            "&:hover": { bgcolor: "primary.main" },
                          }}
                        >
                          Accept
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            );
          })
        )}
      </Stack>
    </Menu>
  );
}