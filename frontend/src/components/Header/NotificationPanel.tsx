import { useState, useMemo, useEffect } from "react";
import { Menu, Typography, Button, Box, Avatar, Paper, Chip, Stack, useTheme } from "@mui/material";
import { useNotifications } from "../../context/useNotifications";
import { getCsrfToken } from "../../lib/csrf";
import { initials } from "../../lib/initials";
import { avatarColor } from "../../lib/avatarColor";
import { useOrgList } from "../../context/useOrgList";
import { acceptInvitation, declineInvitation, InvitationResolveError,
} from "../../lib/notifications";
import type { InvitationPayload, Notification, NotificationType,
} from "../../context/NotificationContext";

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

/** "just now" / "5m ago" / "2h ago" / "3d ago" — good enough for an inbox menu. */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function isInvitationPayload(p: Record<string, unknown>): p is InvitationPayload {
  return typeof p.invitation_id === "number" && typeof p.invited_by === "string";
}

function typeText(type: NotificationType, p: Record<string, unknown>): string {
  switch (type) {
    case "invitation":
      return isInvitationPayload(p)
        ? `${p.invited_by} invited you to ${p.org_name} workspace`
        : "You have a new invitation";
    case "transaction_added":
      return "A new transaction was added";
    case "goal_completed":
      return "A spending goal has been achieved";
    case "member_left":
      return "A member left the organization";
    default:
      return "Notification";
  }
}

/**
 * One invitation row with working Accept / Decline buttons.
 *
 * Not a MenuItem: MUI v7 dropped `secondaryAction`, so this is a plain
 * flex row inside the Menu's paper with the same look.
 *
 * The backend marks the matching notification read on accept/decline, so on
 * success we refetch the notification list (badge + rows). Accepting also
 * adds a workspace, so we refresh the shared org list — that is what the
 * OrgSwitcher reads.
 */

export function NotificationPanel({ anchorEl, onClose }: NotificationPanelProps) {
  const theme = useTheme();
  const { notifications, clearAll, loadFullList, refresh } = useNotifications();
  const { refresh: refreshOrgList } = useOrgList();
  const [filter, setFilter] = useState<"all" | "invitations">("all");

  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

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

  const handleResolveInvitation = async (n: Notification, kind: "accept" | "decline") => {
    const payload = isInvitationPayload(n.payload) ? n.payload : null;
    if (!payload) return;

    setBusyIds((prev) => ({ ...prev, [n.id]: true }));
    setErrors((prev) => ({ ...prev, [n.id]: "" }));

    try {
      const fn = kind === "accept" ? acceptInvitation : declineInvitation;
      await fn(payload.invitation_id, getCsrfToken());
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [n.id]: err instanceof InvitationResolveError ? err.message : "Something went wrong",
      }));
      setBusyIds((prev) => ({ ...prev, [n.id]: false }));
      return;
    }

    await refresh().catch(() => {});

    if (kind === "accept") {
      try {
        await refreshOrgList();
        onClose();
      } catch {
        setErrors((prev) => ({
          ...prev,
          [n.id]: "Accepted, but workspace list failed to update — reload page",
        }));
      }
    } else {
      onClose();
    }

    setBusyIds((prev) => ({ ...prev, [n.id]: false }));
    };

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
            const userName = isInvitationPayload(payload) ? payload.invited_by : "User";

            const isBusy = Boolean(busyIds[n.id]);
            const errorMessage = errors[n.id];

            return (
              <Paper
                key={n.id}
                elevation={0}
                data-testid="notification-item"
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
                        {timeAgo(n.created_at)}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.825rem", mt: 0.2 }}>
                      {typeText(n.type, payload)}
                    </Typography>

                    {errorMessage && (
                      <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                        {errorMessage}
                      </Typography>
                    )}

                    {/* Inline Invitation Actions */}
                    {isInvitation && (
                      <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={isBusy}
                          onClick={() => void handleResolveInvitation(n, "decline")}
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
                          disabled={isBusy}
                          onClick={() => void handleResolveInvitation(n, "accept")}
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
