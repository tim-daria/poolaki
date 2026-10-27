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
  Chip,
  Collapse,
  Divider,
  IconButton,
  Link,
  ListItemButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import {
  ComingSoon,
  SettingsCard,
  SettingsRow,
} from "../../components/Settings/SettingsCard";
import { outlinedActionSx } from "../../components/Settings/styles";
import { LEGAL_LINKS } from "../../components/BottomNav/navItems";
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
import { DESKTOP, PAGE_PADDING, PHONE, TABLET } from "../../lib/layout";
import {
  InvitationResolveError,
  acceptInvitation,
  declineInvitation,
} from "../../lib/notifications";
import {
  MAX_ORGS,
  type MyInvitation,
  type Organization,
  describeWorkspace,
  fetchMembers,
  fetchMyInvitations,
  fetchPendingInvitations,
} from "../../lib/organizations";
import { truncateName } from "../../lib/text";

const accountButtonSx = {
  ...outlinedActionSx,
  alignSelf: "flex-start",
} as const;

function Settings() {
  const { user } = useAuth();
  const theme = useTheme();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <Box sx={{ ...PAGE_PADDING, pb: 5 }}>
      <PageTitle />

      {/* Account cards stack on the left, workspaces take the wider right
          column; below desktop everything is one column. On desktop the
          account cards share the workspaces card's height between them. */}
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          [DESKTOP]: {
            gridTemplateColumns: "minmax(280px, 4fr) minmax(0, 9fr)",
          },
        }}
      >
        <Stack spacing={2.5} sx={{ [DESKTOP]: { "& > *": { flex: 1 } } }}>
          <SettingsCard>
            <Typography component="h2" sx={sectionTitleSx}>
              Profile
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Avatar
                sx={{
                  width: 60,
                  height: 60,
                  fontWeight: 600,
                  bgcolor: avatarColor(user?.username, theme.palette.avatar),
                }}
              >
                {initials(user?.username ?? "")}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {user?.username}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", wordBreak: "break-all" }}
                >
                  {user?.email}
                </Typography>
              </Box>
            </Stack>
            <ComingSoon enabled={CAN_EDIT_PROFILE}>
              <Button
                variant="outlined"
                fullWidth
                disabled={!CAN_EDIT_PROFILE}
                sx={{ ...outlinedActionSx, mt: 2.5 }}
              >
                Edit profile
              </Button>
            </ComingSoon>
          </SettingsCard>

          <SettingsCard>
            <Stack spacing={2}>
              <Box>
                <Typography component="h2" sx={sectionTitleSx}>
                  Password
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Keep your account secure
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => setPasswordOpen(true)}
                sx={accountButtonSx}
              >
                Change password
              </Button>
            </Stack>
          </SettingsCard>

          <SettingsCard>
            <Stack spacing={2}>
              <Box>
                <Typography component="h2" sx={sectionTitleSx}>
                  Delete account
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Removes your data and the workspaces you own
                </Typography>
              </Box>
              <ComingSoon enabled={CAN_DELETE_ACCOUNT}>
                <Button
                  variant="outlined"
                  color="error"
                  disabled={!CAN_DELETE_ACCOUNT}
                  sx={{ fontWeight: 600, alignSelf: "flex-start" }}
                >
                  Delete account
                </Button>
              </ComingSoon>
            </Stack>
          </SettingsCard>
        </Stack>

        <WorkspacesCard />
      </Box>

      <Stack
        component="footer"
        direction="row"
        spacing={2}
        sx={{ mt: 3, flexWrap: "wrap" }}
      >
        {LEGAL_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            component={RouterLink}
            to={to}
            underline="hover"
            sx={{ color: "text.secondary" }}
          >
            {label}
          </Link>
        ))}
      </Stack>

      <ChangePasswordForm
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </Box>
  );
}

const sectionTitleSx = { fontWeight: 700, fontSize: "1.15rem" } as const;

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

  const atLimit = organizations.length >= MAX_ORGS;

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
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {organizations.length} workspace
            {organizations.length === 1 ? "" : "s"}
          </Typography>
        }
      />

      <InvitationsBanner />

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gap: 2,
          [TABLET]: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        {sorted.map((org) => (
          <WorkspaceRow
            key={org.id}
            org={org}
            to={`/o/${current.id}/settings/workspaces/${org.id}`}
            subtitle={describeWorkspace(
              org,
              counts[org.id]?.members,
              counts[org.id]?.invited,
            )}
          />
        ))}
        <Tooltip title={atLimit ? `Up to ${MAX_ORGS} workspaces` : ""}>
          <span>
            <ListItemButton
              onClick={() => setCreating(true)}
              disabled={atLimit}
              sx={{ ...workspaceTileSx, borderStyle: "dashed", width: "100%" }}
            >
              <Box sx={workspaceIconSx}>
                <AddIcon fontSize="small" />
              </Box>
              <Typography sx={{ fontWeight: 600 }}>
                Create a workspace
              </Typography>
            </ListItemButton>
          </span>
        </Tooltip>
      </Box>

      <CreateOrgForm open={creating} onClose={() => setCreating(false)} />
    </SettingsCard>
  );
}

/** Each workspace is a bordered tile; the grid, not a divider, separates them. */
const workspaceTileSx = {
  py: 1.5,
  px: 1.5,
  gap: 2,
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
} as const;

const workspaceIconSx = {
  width: 40,
  height: 40,
  borderRadius: 2,
  bgcolor: "primary.light",
  color: "primary.dark",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
} as const;

interface WorkspaceRowProps {
  org: Organization;
  to: string;
  subtitle: string;
}

function WorkspaceRow({ org, to, subtitle }: WorkspaceRowProps) {
  const Icon = org.is_personal ? PersonOutlineIcon : GroupOutlinedIcon;
  return (
    <ListItemButton component={RouterLink} to={to} sx={workspaceTileSx}>
      <Box sx={workspaceIconSx}>
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {org.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
          {subtitle}
        </Typography>
      </Box>
      <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
    </ListItemButton>
  );
}

/**
 * Invitations addressed to the user, each answerable in place. Kept here
 * rather than sent to the bell: that panel lives in the Header, and the
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
        showToast(`Joined ${truncateName(inv.organization_name)}`);
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
      {/* gap, not spacing: spacing sets margins on children, which would
          override the close button's ml: auto. */}
      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
        <MailOutlineIcon fontSize="small" sx={{ color: "accent.main" }} />
        {expanded ? (
          <>
            <Typography component="h3" sx={{ fontWeight: 700 }}>
              Invitations
            </Typography>
            <Chip label={n} size="small" />
            <IconButton
              aria-label="Hide invitations"
              size="small"
              onClick={() => setExpanded(false)}
              sx={{ ml: "auto" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
              {n} pending invitation{n === 1 ? "" : "s"} waiting for you
            </Typography>
            <Link
              component="button"
              variant="body2"
              onClick={() => setExpanded(true)}
              aria-expanded={expanded}
              sx={{ fontWeight: 600, color: "text.primary" }}
            >
              View
            </Link>
          </>
        )}
      </Stack>
      <Collapse in={expanded}>
        <Divider sx={{ mt: 1.5 }} />
        <Stack divider={<Divider />} spacing={2} sx={{ pt: 2 }}>
          {invitations.map((inv) => (
            <Stack
              key={inv.id}
              direction="row"
              sx={{ alignItems: "center", gap: 2, flexWrap: "wrap" }}
            >
              <Box sx={{ ...workspaceIconSx, bgcolor: "background.paper" }}>
                <GroupOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {inv.organization_name}
                </Typography>
                {inv.invited_by && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    from {inv.invited_by}
                  </Typography>
                )}
              </Box>
              {/* Phones: the buttons take a full line of their own, split
                  evenly between them. */}
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ [PHONE]: { width: "100%", "& > *": { flex: 1 } } }}
              >
                <Button
                  variant="outlined"
                  onClick={() => respond(inv, false)}
                  disabled={busyId !== null}
                  sx={outlinedActionSx}
                >
                  Decline
                </Button>
                <Button
                  variant="contained"
                  onClick={() => respond(inv, true)}
                  disabled={busyId !== null}
                  sx={{ fontWeight: 600 }}
                >
                  Accept
                </Button>
              </Stack>
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
