import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Button,
  ListItemText,
  Menu,
  MenuItem,
  Divider,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useOrgList } from "../../context/useOrgList";
import { useCurrentOrg } from "../../context/useCurrentOrg";
import { NAV_DESKTOP } from "../../lib/layout";
import { MAX_ORGS } from "../../lib/organizations";
import { CreateOrgForm } from "../Modals/CreateOrgForm";

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
  const atLimit = organizations.length >= MAX_ORGS;

  return (
    <>
      {/* A plain control, not a tab lookalike: no fill or border at rest. */}
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        color="inherit"
        endIcon={
          <KeyboardArrowDownIcon
            sx={{
              fontSize: "16px !important",
              color: "text.secondary",
              transition: (theme) => theme.transitions.create("transform"),
              transform: anchor ? "rotate(180deg)" : "none",
            }}
          />
        }
        // Truncation hides the full name, so keep it reachable on hover.
        title={currentOrg.name}
        sx={{
          color: "text.primary",
          fontSize: 15,
          fontWeight: 600,
          minHeight: 44,
          maxWidth: "100%",
          [NAV_DESKTOP]: { maxWidth: 240 },
          px: 1,
          py: 0.5,
          gap: "10px",
          justifyContent: "flex-start",
          textAlign: "left",
          "&:hover": { bgcolor: "action.hover" },
          // Without these the icons are squeezed instead of the label.
          "& .MuiButton-endIcon": {
            m: 0,
            flexShrink: 0,
          },
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
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { mt: 1 } } }}
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
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ ml: 0.75 }}
            >
              ({org.is_personal ? "personal" : org.role})
            </Typography>
          </MenuItem>
        ))}

        <Divider />

        {/* Secondary text rather than a Tooltip: a disabled menu item gets no
            pointer events, so a tooltip would never show. */}
        <MenuItem
          disabled={atLimit}
          onClick={() => {
            setAnchor(null);
            setCreateOpen(true);
          }}
        >
          <ListItemText
            primary="Create shared workspace…"
            secondary={atLimit ? `Up to ${MAX_ORGS} workspaces` : undefined}
          />
        </MenuItem>
      </Menu>

      {/* Deliberately not keyed off createOpen: staying mounted is what lets
          the dialog play its closing fade. The form clears itself once that
          has finished, so reopening still starts blank. */}
      <CreateOrgForm open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
