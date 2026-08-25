import { useCurrentOrg } from "../../context/useCurrentOrg";
import { useEffect, useState } from "react";
import { type Member, fetchMembers } from "../../lib/organizations";
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
  const [members, setMembers] = useState<Member[]>([]);
  // TODO: add pending members

  useEffect(() => {
    const ac = new AbortController();

    fetchMembers(org.id, ac.signal)
      .then((res) => setMembers([...res.members].sort(byRoleThenJoined)))
      .catch((e) => {
        if (e.name !== "AbortError") setMembers([]);
      });
  }, [org.id]);

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
      </AvatarGroup>
      {/*TODO: tie with backend
			Happy UI - render pending members
			If 5 (with pending), hide the "Add" button*/}
      <IconButton
        onClick={() => {}}
        sx={{
          backgroundColor: "primary.light",
          border: "2px dashed",
          borderColor: "primary.main",
        }}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
