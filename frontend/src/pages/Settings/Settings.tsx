/**
 * @file Account settings: profile and password, the user's workspaces with
 * any invitations waiting on them, and account deletion.
 */

import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import {
  Avatar,
  Box,
  Button,
  Collapse,
  Divider,
  Link,
  List,
  ListItemButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
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
import { ChangePasswordForm } from "../../components/Modals/ChangePasswordForm";
import { CreateOrgForm } from "../../components/Modals/CreateOrgForm";
import { useAuth } from "../../context/useAuth";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useNotifications } from "../../context/useNotifications";
import { useOrgList } from "../../context/useOrgList";
import { useToast } from "../../context/useToast";
import { CAN_DELETE_ACCOUNT, CAN_EDIT_PROFILE } from "../../lib/account";
import { avatarColor } from "../../lib/avatarColor";
import { getCsrfToken } from "../../lib/csrf";
import { initials } from "../../lib/initials";
import {
  InvitationResolveError,
  acceptInvitation,
  declineInvitation,
} from "../../lib/notifications";
import {
  type MyInvitation,
  type Organization,
  describeWorkspace,
  fetchMembers,
  fetchMyInvitations,
  fetchPendingInvitations,
} from "../../lib/organizations";

function Settings() {
  const { user } = useAuth();
  const theme = useTheme();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <Box sx={settingsColumnSx}>
      <PageTitle />

      <SettingsCard>
        <Typography component="h2" sx={{ fontWeight: 700, mb: 2 }}>
          Profile
        </Typography>
        <SettingsRow
          title={
            <Stack
              direction="row"
              spacing={2}
              component="span"
              sx={{ alignItems: "center" }}
            >
              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  fontWeight: 600,
                  bgcolor: avatarColor(user?.username, theme.palette.avatar),
                }}
              >
                {initials(user?.username ?? "")}
              </Avatar>
              <Box component="span" sx={{ minWidth: 0 }}>
                <Box component="span" sx={{ display: "block" }}>
                  {user?.username}
                </Box>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    display: "block",
                    wordBreak: "break-all",
                  }}
                >
                  {user?.email}
                </Typography>
              </Box>
            </Stack>
          }
          action={
            <ComingSoon enabled={CAN_EDIT_PROFILE}>
              <Button
                variant="outlined"
                disabled={!CAN_EDIT_PROFILE}
                sx={outlinedActionSx}
              >
                Edit profile
              </Button>
            </ComingSoon>
          }
        />
        <Divider sx={{ my: 2.5 }} />
        <SettingsRow
          title="Password"
          subtitle="Keep your account secure"
          action={
            <Button
              variant="outlined"
              onClick={() => setPasswordOpen(true)}
              sx={outlinedActionSx}
            >
              Change
            </Button>
          }
        />
      </SettingsCard>

      <WorkspacesCard />

      <SettingsCard>
        <SettingsRow
          title="Delete account"
          subtitle="Removes your data and workspaces you own"
          action={
            <ComingSoon enabled={CAN_DELETE_ACCOUNT}>
              <Button
                variant="outlined"
                color="error"
                disabled={!CAN_DELETE_ACCOUNT}
                sx={{ fontWeight: 600 }}
              >
                Delete
              </Button>
            </ComingSoon>
          }
        />
      </SettingsCard>

      <ChangePasswordForm
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </Box>
  );
}

type Counts = Record<number, { members: number; invited: number }>;

function WorkspacesCard() {
  const current = useCurrentOrg();
  const { organizations } = useOrgList();
  const [creating, setCreating] = useState(false);
  const [counts, setCounts] = useState<Counts>({});

  // One members call per shared workspace (plus invitations where the user
  // owns it). There is no bulk endpoint, and the list tops out at a handful.
  useEffect(() => {
    const ac = new AbortController();
    for (const org of organizations) {
      if (org.is_personal) continue;
      Promise.all([
        fetchMembers(org.id, ac.signal),
        org.role === "owner"
          ? fetchPendingInvitations(org.id, ac.signal)
          : Promise.resolve({ invitations: [] }),
      ])
        .then(([m, i]) =>
          setCounts((c) => ({
            ...c,
            [org.id]: {
              members: m.members.length,
              invited: i.invitations.length,
            },
          })),
        )
        // The subtitle already falls back to role-only, which is enough.
        .catch(() => {});
    }
    return () => ac.abort();
  }, [organizations]);

  // The personal workspace first, then shared ones in the backend's order.
  const sorted = [...organizations].sort(
    (a, b) => Number(b.is_personal) - Number(a.is_personal),
  );

  return (
    <SettingsCard>
      <SettingsRow
        title="Workspaces"
        titleVariant="section"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreating(true)}
            sx={{ fontWeight: 600 }}
          >
            New workspace
          </Button>
        }
      />

      <InvitationsBanner />

      <List disablePadding sx={{ mt: 1.5 }}>
        {sorted.map((org, i) => (
          <WorkspaceRow
            key={org.id}
            org={org}
            to={`/o/${current.id}/settings/workspaces/${org.id}`}
            subtitle={describeWorkspace(
              org,
              counts[org.id]?.members,
              counts[org.id]?.invited,
            )}
            divider={i < sorted.length - 1}
          />
        ))}
      </List>

      <CreateOrgForm open={creating} onClose={() => setCreating(false)} />
    </SettingsCard>
  );
}

interface WorkspaceRowProps {
  org: Organization;
  to: string;
  subtitle: string;
  divider: boolean;
}

function WorkspaceRow({ org, to, subtitle, divider }: WorkspaceRowProps) {
  const Icon = org.is_personal ? PersonOutlineIcon : GroupOutlinedIcon;
  return (
    <ListItemButton
      component={RouterLink}
      to={to}
      divider={divider}
      sx={{ py: 1.5, px: 1, gap: 2, borderRadius: 2 }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: "primary.light",
          color: "primary.dark",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {org.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {subtitle}
        </Typography>
      </Box>
      <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
    </ListItemButton>
  );
}

/**
 * Invitations addressed to the user, answerable in place. Kept here rather
 * than sending them to the bell: that panel lives in the Header, and the
 * notification list is capped and mixed with other types.
 */
function InvitationsBanner() {
  const { refresh: refreshOrgs } = useOrgList();
  const { refresh: refreshNotifications } = useNotifications();
  const { showToast } = useToast();
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    fetchMyInvitations(ac.signal)
      .then((res) => setInvitations(res.invitations))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  if (invitations.length === 0) return null;

  async function respond(inv: MyInvitation, accept: boolean) {
    setBusyId(inv.id);
    setError("");
    try {
      if (accept) {
        await acceptInvitation(inv.id, getCsrfToken());
        await refreshOrgs();
        showToast(`Joined ${inv.organization_name}`);
      } else {
        await declineInvitation(inv.id, getCsrfToken());
        showToast("Invitation declined");
      }
      setInvitations((list) => list.filter((i) => i.id !== inv.id));
      // The bell still holds this invitation's notification.
      void refreshNotifications();
    } catch (err) {
      setError(
        err instanceof InvitationResolveError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const n = invitations.length;
  return (
    <Box
      sx={{
        mt: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
        borderRadius: 2,
        px: 2,
        py: 1.25,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <MailOutlineIcon fontSize="small" sx={{ color: "accent.main" }} />
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
          {n} pending invitation{n === 1 ? "" : "s"} waiting for you
        </Typography>
        <Link
          component="button"
          variant="body2"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          sx={{ fontWeight: 600, color: "text.primary" }}
        >
          {expanded ? "Hide" : "View"}
        </Link>
      </Stack>
      <Collapse in={expanded}>
        <Stack spacing={1} sx={{ pt: 1.5 }}>
          {invitations.map((inv) => (
            <Stack
              key={inv.id}
              direction="row"
              sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}
            >
              <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }}>
                <strong>{inv.organization_name}</strong>
                {inv.invited_by && ` · from ${inv.invited_by}`}
              </Typography>
              <Button
                size="small"
                onClick={() => respond(inv, false)}
                disabled={busyId !== null}
              >
                Decline
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => respond(inv, true)}
                disabled={busyId !== null}
              >
                Accept
              </Button>
            </Stack>
          ))}
          {error && (
            <Typography variant="body2" sx={{ color: "error" }}>
              {error}
            </Typography>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}

export { Settings as Component };
