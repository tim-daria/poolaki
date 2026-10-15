/**
 * @file Settings for one workspace: its name, and for shared workspaces the
 * members, pending invitations, leaving and deletion.
 */

import { type ReactNode, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import {
  ComingSoon,
  SettingsCard,
  SettingsRow,
} from "../../components/Settings/SettingsCard";
import {
  outlinedActionSx,
  settingsColumnSx,
} from "../../components/Settings/styles";
import { PageTitle } from "../../components/PageHeader/PageHeader";
import { ConfirmDialog } from "../../components/Modals/ConfirmDialog";
import { InvitationForm } from "../../components/Modals/InvitationForm";
import { RenameOrgForm } from "../../components/Modals/RenameOrgForm";
import { NoAccessScreen } from "../../components/NoAccessScreen";
import { useAuth } from "../../context/useAuth";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useOrgList } from "../../context/useOrgList";
import { useToast } from "../../context/useToast";
import { avatarColor } from "../../lib/avatarColor";
import { getCsrfToken } from "../../lib/csrf";
import { initials } from "../../lib/initials";
import {
  type LeaveOutcome,
  MAX_MEMBERS,
  type Member,
  type Organization,
  type PendingInvitation,
  WorkspaceRequestError,
  byRoleThenJoined,
  cancelInvitation,
  fetchMembers,
  fetchPendingInvitations,
  leaveOrganization,
  leaveOutcome,
  removeMember,
  successorOwner,
} from "../../lib/organizations";

const joinedFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function OrgSettings() {
  const { workspaceId } = useParams();
  const { organizations } = useOrgList();
  const org = organizations.find((o) => String(o.id) === workspaceId);

  if (!org) return <NoAccessScreen orgId={workspaceId} />;

  // Keyed so switching between workspace URLs never carries one workspace's
  // members, dialogs or drafts into another: the route element is shared.
  return <WorkspaceSettings key={org.id} org={org} />;
}

function WorkspaceSettings({ org }: { org: Organization }) {
  const current = useCurrentOrg();
  const { user } = useAuth();
  const { refresh } = useOrgList();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isOwner = org.role === "owner";

  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<PendingInvitation[]>([]);
  // Bumped to refetch after an invite, a cancel, a removal or a failed leave.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    // A personal workspace only ever holds its owner; nothing to fetch.
    if (org.is_personal) return;
    const ac = new AbortController();
    fetchMembers(org.id, ac.signal)
      .then((res) => setMembers([...res.members].sort(byRoleThenJoined)))
      .catch(() => {});
    // Owner-only endpoint; a member asking gets a guaranteed 403.
    if (isOwner) {
      fetchPendingInvitations(org.id, ac.signal)
        .then((res) => setPending(res.invitations))
        .catch(() => {});
    }
    return () => ac.abort();
  }, [org.id, org.is_personal, isOwner, version]);

  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState<LeaveOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  // The self row is always present once loaded, so an empty list means the
  // fetch has not landed yet and no leave/delete row should be offered.
  const membersLoaded = members.length > 0;
  const outcome = membersLoaded ? leaveOutcome(org.role, members.length) : null;
  const successor = user ? successorOwner(members, user.id) : undefined;

  async function confirmLeave() {
    setBusy(true);
    try {
      const { organization_deleted } = await leaveOrganization(
        org.id,
        getCsrfToken(),
      );
      // Navigate before refreshing: OrgLayout and this page resolve the org
      // from the list, so refreshing first would render NoAccessScreen for a
      // workspace we just left. "/" goes through OrgRedirect, which picks a
      // workspace from the still-stale list; the refresh then trims it.
      navigate(org.id === current.id ? "/" : `/o/${current.id}/settings`, {
        replace: true,
      });
      await refresh().catch(() => {});
      showToast(
        organization_deleted
          ? `Workspace "${org.name}" deleted`
          : `You left ${org.name}`,
      );
    } catch (err) {
      showToast(
        err instanceof WorkspaceRequestError
          ? err.message
          : "Could not leave the workspace",
      );
      setBusy(false);
      setLeaving(null);
      reload();
    }
  }

  const leaveConfirm = {
    leave: {
      title: `Leave ${org.name}?`,
      message:
        "You lose access to its transactions until you're invited again.",
      confirmLabel: "Leave",
      cancelLabel: "Stay",
    },
    transfer: {
      title: `Leave ${org.name}?`,
      message: `${successor?.username ?? "The longest-standing member"} becomes the owner, and you lose access until you're invited again.`,
      confirmLabel: "Leave",
      cancelLabel: "Stay",
    },
    delete: {
      title: `Delete ${org.name}?`,
      message: `You're its only member. The workspace and all its transactions will be deleted${
        pending.length
          ? `, and ${pending.length} pending invitation${pending.length === 1 ? "" : "s"} withdrawn.`
          : "."
      }`,
      confirmLabel: "Delete",
      cancelLabel: "Keep",
    },
  } satisfies Record<
    LeaveOutcome,
    {
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
    }
  >;

  return (
    <Box sx={settingsColumnSx}>
      <PageTitle
        title={org.name}
        back={{ to: `/o/${current.id}/settings`, label: "Settings" }}
      />

      <SettingsCard>
        <SettingsRow
          title="Workspace name"
          subtitle={org.name}
          action={
            // The backend rejects renaming the personal workspace.
            isOwner &&
            !org.is_personal && (
              <Button
                variant="outlined"
                onClick={() => setRenaming(true)}
                sx={outlinedActionSx}
              >
                Rename
              </Button>
            )
          }
        />
        {!org.is_personal && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <MembersSection
              org={org}
              members={members}
              pending={pending}
              reload={reload}
            />
          </>
        )}
      </SettingsCard>

      {/* An owner leaving hands the workspace to the longest-standing member;
          only a sole owner deletes it, via the Delete row below. */}
      {!org.is_personal && (outcome === "leave" || outcome === "transfer") && (
        <SettingsCard>
          <SettingsRow
            title="Leave workspace"
            subtitle={
              outcome === "transfer"
                ? "Ownership passes to the longest-standing member"
                : "You lose access to its transactions until invited again"
            }
            action={
              <Button
                variant="outlined"
                color="error"
                onClick={() => setLeaving(outcome)}
                sx={{ fontWeight: 600 }}
              >
                Quit
              </Button>
            }
          />
        </SettingsCard>
      )}

      {!org.is_personal && isOwner && outcome !== "transfer" && (
        <SettingsCard>
          <SettingsRow
            title="Delete workspace"
            subtitle={
              outcome === "delete"
                ? "You're the only member, so the workspace and its transactions are deleted"
                : "All members lose access to its transactions"
            }
            action={
              <Button
                variant="outlined"
                color="error"
                disabled={outcome !== "delete"}
                onClick={() => setLeaving("delete")}
                sx={{ fontWeight: 600 }}
              >
                Delete
              </Button>
            }
          />
        </SettingsCard>
      )}

      {/* Deleting with other members present has no backend route yet. */}
      {!org.is_personal && isOwner && outcome === "transfer" && (
        <SettingsCard>
          <SettingsRow
            title="Delete workspace"
            subtitle="All members lose access to its transactions"
            action={
              <ComingSoon enabled={false}>
                <Button
                  variant="outlined"
                  color="error"
                  disabled
                  sx={{ fontWeight: 600 }}
                >
                  Delete
                </Button>
              </ComingSoon>
            }
          />
        </SettingsCard>
      )}

      <RenameOrgForm
        open={renaming}
        onClose={() => setRenaming(false)}
        org={org}
      />
      <ConfirmDialog
        open={leaving !== null}
        {...leaveConfirm[leaving ?? "leave"]}
        onConfirm={confirmLeave}
        onCancel={() => setLeaving(null)}
        busy={busy}
      />
    </Box>
  );
}

interface MembersSectionProps {
  org: Organization;
  members: Member[];
  pending: PendingInvitation[];
  reload: () => void;
}

function MembersSection({
  org,
  members,
  pending,
  reload,
}: MembersSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [cancelling, setCancelling] = useState<PendingInvitation | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  // Shared by both confirm dialogs; only one can be open at a time.
  const [busy, setBusy] = useState(false);
  const isOwner = org.role === "owner";

  const isFull = members.length + pending.length >= MAX_MEMBERS;

  async function confirmCancel() {
    if (!cancelling) return;
    setBusy(true);
    try {
      await cancelInvitation(org.id, cancelling.id, getCsrfToken());
      showToast(`Invitation to ${cancelling.invited_user} cancelled`);
    } catch (err) {
      // Most likely answered in the meantime; the refetch shows the new state.
      showToast(
        err instanceof WorkspaceRequestError
          ? err.message
          : "Could not cancel the invitation",
      );
    } finally {
      reload();
      setBusy(false);
      setCancelling(null);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    try {
      await removeMember(org.id, removing.user_id, getCsrfToken());
      showToast(`${removing.username} removed from ${org.name}`);
    } catch (err) {
      // A 400 means they already left; a 403 means we're no longer the
      // owner. The refetch shows the truth either way.
      showToast(
        err instanceof WorkspaceRequestError
          ? err.message
          : `Could not remove ${removing.username}`,
      );
    } finally {
      reload();
      setBusy(false);
      setRemoving(null);
    }
  }

  return (
    <>
      <SettingsRow
        title="Members"
        titleVariant="section"
        action={
          isOwner && (
            <Tooltip title={isFull ? `Up to ${MAX_MEMBERS} members` : ""}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setInviteOpen(true)}
                  disabled={isFull}
                  sx={{ fontWeight: 600 }}
                >
                  Invite
                </Button>
              </span>
            </Tooltip>
          )
        }
      />

      <Stack divider={<Divider />} sx={{ mt: 1.5 }}>
        {members.map((m) => (
          <MemberRow
            key={m.user_id}
            member={m}
            isSelf={m.user_id === user?.id}
            email={m.user_id === user?.id ? user.email : undefined}
            canManage={isOwner}
            onRemove={() => setRemoving(m)}
          />
        ))}
        {pending.map((p) => (
          <PersonRow
            key={`pending-${p.id}`}
            avatar={
              <Avatar
                sx={{
                  bgcolor: "transparent",
                  color: "text.secondary",
                  border: "1.5px dashed",
                  borderColor: "divider",
                }}
              >
                <MailOutlineIcon fontSize="small" />
              </Avatar>
            }
            name={p.invited_user}
            subtitle="Invited · not answered yet"
            trailing={
              <Button
                onClick={() => setCancelling(p)}
                sx={{ fontWeight: 600, color: "primary.dark" }}
              >
                Cancel
              </Button>
            }
          />
        ))}
      </Stack>

      <InvitationForm
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={reload}
        orgId={org.id}
      />
      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel invitation?"
        message={`${cancelling?.invited_user ?? ""} won't be able to join ${org.name} with this invitation.`}
        confirmLabel="Cancel invitation"
        cancelLabel="Keep"
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
        busy={busy}
      />
      <ConfirmDialog
        open={removing !== null}
        title="Remove member?"
        message={`${removing?.username ?? ""} will lose access to ${org.name} and its transactions until invited again.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
        busy={busy}
      />
    </>
  );
}

interface MemberRowProps {
  member: Member;
  isSelf: boolean;
  email?: string;
  canManage: boolean;
  onRemove: () => void;
}

function MemberRow({
  member,
  isSelf,
  email,
  canManage,
  onRemove,
}: MemberRowProps) {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const role = member.role === "owner" ? "Owner" : "Member";

  return (
    <PersonRow
      avatar={
        <Avatar
          sx={{
            fontWeight: 600,
            bgcolor: avatarColor(member.username, theme.palette.avatar),
          }}
        >
          {initials(member.username)}
        </Avatar>
      }
      name={
        <>
          {member.username}
          {isSelf && (
            <Box
              component="span"
              sx={{ color: "text.secondary", fontWeight: 400 }}
            >
              {" "}
              (you)
            </Box>
          )}
        </>
      }
      subtitle={
        email ?? `Joined ${joinedFormat.format(new Date(member.joined_at))}`
      }
      trailing={
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {role}
          </Typography>
          {canManage && !isSelf && (
            <>
              <IconButton
                size="small"
                aria-label={`Manage ${member.username}`}
                onClick={(e) => setAnchor(e.currentTarget)}
              >
                <MoreHorizIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => setAnchor(null)}
              >
                {/* Close the menu in the same handler that opens the confirm
                    dialog, so its focus trap is gone before the dialog's
                    starts (same as OrgSwitcher). */}
                <MenuItem
                  onClick={() => {
                    setAnchor(null);
                    onRemove();
                  }}
                >
                  <ListItemIcon>
                    <PersonRemoveOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Remove from workspace" />
                </MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      }
    />
  );
}

interface PersonRowProps {
  avatar: ReactNode;
  name: ReactNode;
  subtitle: string;
  trailing: ReactNode;
}

function PersonRow({ avatar, name, subtitle, trailing }: PersonRowProps) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "center", py: 1.75, minWidth: 0 }}
    >
      {avatar}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {name}
        </Typography>
        <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
          {subtitle}
        </Typography>
      </Box>
      {trailing}
    </Stack>
  );
}

export { OrgSettings as Component };
