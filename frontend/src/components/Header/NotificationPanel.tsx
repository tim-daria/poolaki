import { useState } from "react";
import {
  Menu,
  MenuItem,
  Typography,
  Button,
  Divider,
  Box,
  Stack,
} from "@mui/material";
import { useNotifications } from "../../context/useNotifications";
import { useOrgList } from "../../context/useOrgList";
import {
  acceptInvitation,
  declineInvitation,
  InvitationResolveError,
} from "../../lib/notifications";
import { getCsrfToken } from "../../lib/csrf";
import type {
  InvitationPayload,
  Notification,
  NotificationType,
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
      // Unknown type from a newer backend — render something neutral instead
      // of breaking the whole list.
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
function InvitationRow({ n, onClose }: { n: Notification; onClose: () => void }) {
  const { refresh } = useNotifications();
  const { refresh: refreshOrgList } = useOrgList();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const payload = isInvitationPayload(n.payload) ? n.payload : null;

  const act = async (kind: "accept" | "decline") => {
    if (!payload) return;
    setBusy(true);
    setError("");
    try {
      const fn = kind === "accept" ? acceptInvitation : declineInvitation;
      await fn(payload.invitation_id, getCsrfToken());
    } catch (err) {
      // A resolved invitation returns 400 with a message — show it and keep
      // the row visible (the backend still holds it) instead of a generic crash.
      setError(err instanceof InvitationResolveError ? err.message : "Something went wrong");
      setBusy(false);
      return;
    }
    // The backend drops the resolved row from the next list response, so a
    // list refresh removes it and updates the badge. A failed notification
    // refetch must not swallow the org list refresh below, so errors there
    // are best-effort.
    await refresh().catch(() => {});
    if (kind === "accept") {
      // A new workspace just appeared — reload the shared org list so the
      // OrgSwitcher picks it up without forcing the user to navigate.
      try {
        await refreshOrgList();
        onClose();
      } catch {
        // The invitation itself was accepted server-side; only the local
        // list is stale. Keep the row visible so the user knows.
        setError("Accepted, but the workspace list could not be updated — reload the page");
      }
    } else {
      onClose();
    }
    setBusy(false);
  };

  return (
    <Box
      component="li"
      role="menuitem"
      aria-disabled
      tabIndex={-1}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: 2.5,
        py: 1,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: n.is_read ? 400 : 600 }}>
        {typeText(n.type, n.payload)}
        <Box component="span" sx={{ color: "text.secondary", ml: 1 }}>
          {timeAgo(n.created_at)}
        </Box>
        {error && (
          <Box component="span" sx={{ color: "error.main", display: "block" }}>
            {error}
          </Box>
        )}
      </Typography>
      {payload && (
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Button size="small" variant="contained" disabled={busy} onClick={() => void act("accept")}>
            Accept
          </Button>
          <Button size="small" disabled={busy} onClick={() => void act("decline")}>
            Decline
          </Button>
        </Stack>
      )}
    </Box>
  );
}

export function NotificationPanel({ anchorEl, onClose }: NotificationPanelProps) {
  const { notifications, clearAll, markAllAsRead } = useNotifications();

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

      {sorted.map((n) =>
        n.type === "invitation" ? (
          <InvitationRow key={n.id} n={n} onClose={onClose} />
        ) : (
          <MenuItem key={n.id} disabled sx={{ opacity: "1 !important" }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: n.is_read ? 400 : 600 }}
            >
              {typeText(n.type, n.payload)}
              <Box component="span" sx={{ color: "text.secondary", ml: 1 }}>
                {timeAgo(n.created_at)}
              </Box>
            </Typography>
          </MenuItem>
        ),
      )}

      {sorted.length > 0 && (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1 }}>
            <Button
              size="small"
              onClick={() => {
                // Mark everything read (badge → 0), then empty the panel.
                // The API keeps pending invitations listed until resolved,
                // so the local clear is a visual "hide" until the next poll.
                void markAllAsRead();
                clearAll();
                onClose();
              }}
            >
              Clear all
            </Button>
          </Box>
        </>
      )}
    </Menu>
  );
}
