import { useState } from "react";
import { useNavigate } from "react-router";
import { Box, Button, Menu, MenuItem, Divider } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useOrgList } from "../../context/useOrgList";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { CreateOrgModal } from "../CreateOrgModal";

/**
 * Switching workspaces is a navigation — OrgLayout resolves :orgId against the
 * in-memory list and renders NoAccessScreen when it misses, because it has to
 * for direct URL visits and reloads anyway. Hence no loading state or error
 * handling here, and no request on switch.
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
        color="inherit"
        endIcon={
          <KeyboardArrowDownIcon
            sx={{
              transition: (theme) => theme.transitions.create("transform"),
              transform: anchor ? "rotate(180deg)" : "none",
            }}
          />
        }
        // Truncation hides the full name, so keep it reachable on hover.
        title={currentOrg.name}
        sx={{
          // Reads as a distinct control against the white AppBar by borrowing
          // the page background behind it.
          bgcolor: "background.default",
          color: "text.primary",
          fontSize: "1.05rem",
          fontWeight: 600,
          px: 1.5,
          py: 0.5,
          "&:hover": { bgcolor: "primary.light" },
          // Fixed so the header doesn't reflow when switching workspaces, but
          // in rem so it tracks the root font size.
          width: "14rem",
          maxWidth: "100%",
          justifyContent: "space-between",
          // Without this the chevron is squeezed instead of the label.
          "& .MuiButton-endIcon": { flexShrink: 0 },
        }}
      >
        <Box
          component="span"
          sx={{
            // minWidth: 0 — a flex item won't shrink below its content width
            // otherwise, and the ellipsis never appears.
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentOrg.name}
        </Box>
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
