import { useState, useEffect } from "react";
import {
  Popover,
  Typography,
  Button,
  Box,
  Avatar,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router"; //to handle route redirection on notification click
import {
  getNotificationDetails,
  getNotificationActorName,
  isInvitationPayload,
} from "../../lib/notificationFormatting";
import { useNotifications } from "../../context/useNotifications";
import { getCsrfToken } from "../../lib/csrf";
import { initials } from "../../lib/initials";
import { avatarColor } from "../../lib/avatarColor";
import { useOrgList } from "../../context/useOrgList";
import {
  acceptInvitation,
  declineInvitation,
  InvitationResolveError,
} from "../../lib/notifications";
import type { Notification } from "../../context/NotificationContext";

interface NotificationPanelProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

/**
 * Calculates a human-readable relative time string from an ISO timestamp.
 * "just now" / "5m ago" / "2h ago" / "3d ago" — good enough for an inbox menu.
 */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * The notification inbox, anchored to the header bell.
 */

export function NotificationPanel({
  anchorEl,
  onClose,
}: NotificationPanelProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { notifications, clearAll, loadFullList, refresh } = useNotifications();
  const { organizations, refresh: refreshOrgList } = useOrgList();
  const isAtOrgLimit = (organizations?.length ?? 0) >= 10;
  const [filter, setFilter] = useState<"all" | "invitations">("all");

  const [busyIds, setBusyIds] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [listError, setListError] = useState("");

  useEffect(() => {
    if (!anchorEl) return;
    const ac = new AbortController();

    loadFullList(undefined, ac.signal)
      .then(() => setListError(""))
      .catch(() =>
        setListError("Couldn't load notifications - please try again"),
      );
    return () => ac.abort();
  }, [anchorEl, loadFullList]);

  /**
   * No useMemo, because React Compiler is used here
   * and it takes care of memoisation
   */
  const invitationsCount = notifications.filter(
    (n) => n.type === "invitation" && !n.is_read,
  ).length;

  const filteredNotifications =
    filter === "invitations"
      ? notifications.filter((n) => n.type === "invitation" && !n.is_read)
      : notifications.filter((n) => !(n.type === "invitation" && n.is_read));

  // Matches provider logic: invitations can only be accepted/declined, not marked as read.
  const markableCount = notifications.filter(
    (n) => n.type !== "invitation" && !n.is_read,
  ).length;

  const handleResolveInvitation = async (
    n: Notification,
    kind: "accept" | "decline",
  ) => {
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
        [n.id]:
          err instanceof InvitationResolveError
            ? err.message
            : "Something went wrong",
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

  const handleMarkAllRead = async () => {
    setClearing(true);
    setClearError("");
    try {
      await clearAll(getCsrfToken());
      onClose();
    } catch {
      // Stay open: the rows are still unread, and closing would present the
      // failure as a success.
      setClearError("Couldn't mark notifications as read — please try again");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Popover
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        // On the paper, not the root: Popover's root is role="presentation",
        // so a role or label there is dropped. The paper is the thing that
        // traps focus and closes on Escape, which is what "dialog" describes
        // — and what the bell's aria-haspopup promises.
        paper: {
          role: "dialog",
          "aria-labelledby": "notification-panel-title",
          sx: { width: 380, p: 2, boxShadow: 8, mt: 1 },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        {/* Popover has no implicit accessible name, so this heading supplies
            one via the root's aria-labelledby. */}
        <Typography
          id="notification-panel-title"
          variant="h6"
          component="h2"
          sx={{ fontWeight: 700, fontSize: "1.1rem" }}
        >
          All notifications
        </Typography>
      </Box>

      {/* Controls: Filter Pills & Mark All as Read */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        {/* Selection state lives in the Mui-selected class rather than a
            ternary per property, and the group supplies role="group" plus
            aria-pressed on each button. */}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          // With `exclusive`, clicking the already-selected button fires with
          // null. Ignoring that keeps a filter applied at all times.
          onChange={(_, next: "all" | "invitations" | null) => {
            if (next) setFilter(next);
          }}
          aria-label="Filter notifications"
          sx={{
            bgcolor: "background.default",
            borderRadius: 999,
            p: "3px",
            gap: 0.5,
            // The group's own `grouped` rules square off the inner edges and
            // pull the children together with a negative margin, so the pill
            // shape has to be restated for both ends to out-specify them.
            "& .MuiToggleButtonGroup-grouped": {
              border: 0,
              px: 1.5,
              py: 0.25,
              fontWeight: 600,
              fontSize: "0.75rem",
              color: "text.secondary",
              "&:first-of-type": { borderRadius: 999 },
              "&:not(:first-of-type)": { borderRadius: 999, ml: 0 },
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.main" },
              },
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="invitations">
            Invitations ({invitationsCount})
          </ToggleButton>
        </ToggleButtonGroup>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <Button
            variant="text"
            size="small"
            disabled={clearing || markableCount === 0}
            onClick={() => void handleMarkAllRead()}
            sx={{
              color: "primary.dark",
              fontWeight: 600,
              fontSize: "0.8rem",
              "&:hover": {
                bgcolor: "transparent",
                textDecoration: "underline",
              },
            }}
          >
            {clearing ? "Marking…" : "Mark all as read"}
          </Button>
          {clearError && (
            <Typography variant="caption" color="error">
              {clearError}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Notification List */}
      {listError && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {listError}
        </Typography>
      )}
      {filteredNotifications.length === 0 ? (
        // Outside the list below: a <ul> may only contain <li>, so the empty
        // message cannot live inside it.
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ py: 3 }}
        >
          No notifications to display
        </Typography>
      ) : (
        /* A real list, so the row count is announced and each row is reachable
           as a listitem — semantics role="menu" could not carry, since a
           menuitem may not contain focusable children (Accept / Decline). */
        <Stack
          component="ul"
          spacing={1}
          sx={{ listStyle: "none", m: 0, p: 0 }}
        >
          {filteredNotifications.map((n) => {
            const isInvitation = n.type === "invitation";
            const payload = n.payload;
            const userName = getNotificationActorName(n.type, payload);
            const details = getNotificationDetails(n.type, payload);

            const isBusy = Boolean(busyIds[n.id]);
            const errorMessage = errors[n.id];

            return (
              <Paper
                key={n.id}
                component="li"
                elevation={0}
                onClick={() => {
                  if (details.route && !isInvitation) {
                    navigate(details.route);
                    onClose();
                  }
                }}
                sx={{
                  p: 1.5,
                  cursor:
                    details.route && !isInvitation ? "pointer" : "default",
                  transition: "background-color 0.2s",
                  "&:hover": {
                    bgcolor:
                      details.route && !isInvitation
                        ? "action.hover"
                        : "inherit",
                  },
                }}
              >
                <Box
                  sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
                >
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
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, fontSize: "0.875rem" }}
                      >
                        {userName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem" }}
                      >
                        {timeAgo(n.created_at)}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.825rem", mt: 0.2 }}
                    >
                      {details.text}
                    </Typography>

                    {errorMessage && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {errorMessage}
                      </Typography>
                    )}

                    {/* Inline Invitation Actions */}
                    {isInvitation && (
                      <Box sx={{ mt: 1.5 }}>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={isBusy}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleResolveInvitation(n, "decline");
                            }}
                            sx={{
                              bgcolor: "background.paper",
                              borderColor: "primary.main",
                              borderRadius: 999,
                              color: "text.primary",
                              px: 2,
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              "&:hover": {
                                bgcolor: "primary.light",
                                borderColor: "divider",
                              },
                            }}
                          >
                            Decline
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            disabled={isBusy || isAtOrgLimit}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleResolveInvitation(n, "accept");
                            }}
                            sx={{
                              bgcolor: "primary.main",
                              borderRadius: 999,
                              px: 2,
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              "&:hover": { bgcolor: "primary.dark" },
                            }}
                          >
                            Accept
                          </Button>
                        </Box>

                        {isAtOrgLimit && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{
                              display: "block",
                              mt: 1,
                              fontSize: "0.75rem",
                            }}
                          >
                            You have reached the maximum limit of 10
                            organizations. Leave one to accept this invitation.
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Popover>
  );
}
