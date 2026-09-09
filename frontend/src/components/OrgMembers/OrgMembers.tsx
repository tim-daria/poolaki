/** @file Member avatars for the current workspace, with the owner's invite control. */

import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useEffect, useState } from "react";
import {
  type Member,
  type PendingInvitation,
  fetchMembers,
  fetchPendingInvitations,
} from "../../lib/organizations";
import { InvitationForm } from "../Modals/InvitationForm";
import {
  AvatarGroup,
  IconButton,
  Stack,
  Typography,
  Tooltip,
  Avatar,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { initials } from "../../lib/initials";
import { avatarColor } from "../../lib/avatarColor";

/**
 * Mirrors MAX_MEMBERS_PER_ORG in core/services/organization.py. Duplicated
 * rather than fetched: the backend enforces it regardless, so the worst a
 * drift can do here is offer an invite that comes back rejected.
 */
const MAX_MEMBERS = 5;

/**
 * A response tagged with the workspace it was fetched for, so a result that
 * arrives after a switch can be told apart from the current one.
 */
type LoadedFor<T> = { orgId: number; data: T };

/**
 * Owners first, then by join date.
 *
 * The endpoint returns memberships in no particular order, and AvatarGroup
 * hides everything past `max` behind a surplus counter — without this the
 * owner can be the one that gets hidden.
 */
function byRoleThenJoined(a: Member, b: Member): number {
  if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
  return a.joined_at.localeCompare(b.joined_at);
}

export function OrgMembers() {
  const org = useCurrentOrg();
  const theme = useTheme();
  const [loadedMembers, setLoadedMembers] = useState<LoadedFor<
    Member[]
  > | null>(null);
  const [loadedPending, setLoadedPending] = useState<LoadedFor<
    PendingInvitation[]
  > | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  /**
   * Only the owner may invite, and only into a shared workspace. Anyone else
   * pressing the button would get a 403 or a 400 whose message is about
   * permissions rather than anything they can fix, so the button is not shown.
   */
  const canInvite = !org.is_personal && org.role === "owner";

  /**
   * A result for a previous workspace reads as "nothing loaded", so a switch
   * needs no reset: clearing state in the effect would mean a setState the
   * effect has to make synchronously, which cascades renders.
   */
  const members = loadedMembers?.orgId === org.id ? loadedMembers.data : [];
  const pending =
    canInvite && loadedPending?.orgId === org.id ? loadedPending.data : [];

  /**
   * Mirrors the backend's own capacity rule: pending invitations occupy a slot
   * too, otherwise a sixth invite is sent only to be rejected on accept.
   */
  const isFull = members.length + pending.length >= MAX_MEMBERS;

  const loadMembers = (signal?: AbortSignal) => {
    // Read once, so a response is filed under the workspace it was asked for
    // even if `org` has moved on by the time it resolves.
    const orgId = org.id;

    fetchMembers(orgId, signal)
      .then((res) =>
        setLoadedMembers({
          orgId,
          data: [...res.members].sort(byRoleThenJoined),
        }),
      )
      .catch((e) => {
        if (e.name !== "AbortError") setLoadedMembers({ orgId, data: [] });
      });

    // Owner-only endpoint. Asking as a member is a guaranteed 403, and the
    // count is only needed to decide whether to offer an invite anyway.
    if (!canInvite) return;
    fetchPendingInvitations(orgId, signal)
      .then((res) => setLoadedPending({ orgId, data: res.invitations }))
      .catch((e) => {
        if (e.name !== "AbortError") setLoadedPending({ orgId, data: [] });
      });
  };

  useEffect(() => {
    const ac = new AbortController();
    loadMembers(ac.signal);
    return () => ac.abort();
  }, [loadMembers]);

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "center", minWidth: 0 }}
    >
      <Typography variant="h2" component="h1">
        Members
      </Typography>
      <AvatarGroup
        max={5}
        sx={{
          "& .MuiAvatar-root": {
            width: 36,
            height: 36,
            fontSize: "1rem",
          },
        }}
      >
        {members.map((m) => (
          <Tooltip key={m.user_id} title={m.username}>
            <Avatar
              sx={{ bgcolor: avatarColor(m.username, theme.palette.avatar) }}
            >
              {initials(m.username)}
            </Avatar>
          </Tooltip>
        ))}
        {/* Dimmed and outlined: an invitee has not accepted yet, so they must
            not read as someone already in the workspace. */}
        {pending.map((p) => (
          <Tooltip
            key={`pending-${p.id}`}
            title={`${p.invited_user} (invited)`}
          >
            <Avatar
              sx={{
                bgcolor: "transparent",
                color: "text.disabled",
                border: "2px dashed",
                borderColor: "divider",
              }}
            >
              {initials(p.invited_user)}
            </Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>
      {canInvite && !isFull && (
        <IconButton
          onClick={() => setInviteOpen(true)}
          aria-label="invite a member"
          sx={{
            backgroundColor: "primary.light",
            border: "2px dashed",
            borderColor: "primary.main",
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      )}

      <InvitationForm
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={loadMembers}
      />
    </Stack>
  );
}
