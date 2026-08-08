import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Menu, MenuItem, Divider } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useOrgList } from "../../context/useOrgList";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { CreateOrgModal } from "../CreateOrgModal";

/**
 * Switching workspaces is a navigation — OrgLayout handles resolution, session
 * sync, failure and invalidation, because it has to for direct URL visits and
 * reloads anyway. Hence no loading state or error handling here.
 *
 * MUI Menu rather than the hand-rolled dropdowns elsewhere in the app: it comes
 * with focus trap, arrow-key navigation, Escape and focus restoration.
 */
export function OrgSwitcher() {
  const { organizations } = useOrgList();
  const currentOrg = useCurrentOrg();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
      >
        {currentOrg.name}
      </Button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        {organizations.map((org) => (
          <MenuItem
            key={org.id}
            selected={org.id === currentOrg.id}
            onClick={() => {
              setAnchor(null);
              navigate(`/o/${org.id}`);
            }}
          >
            {org.name}
            {/* is_personal is a capability, not decoration: personal
                workspaces can never be shared. */}
            {org.is_personal && (
              <LockIcon
                fontSize="small"
                titleAccess="Personal — can't be shared"
              />
            )}
          </MenuItem>
        ))}

        <Divider />

        <MenuItem
          onClick={() => {
            setAnchor(null);
            setCreateOpen(true);
          }}
        >
          Create shared workspace…
        </MenuItem>
      </Menu>

      {createOpen && <CreateOrgModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}
