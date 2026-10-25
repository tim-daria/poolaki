/** @file Titled card frame shared by the Overview and Reports cards: optionally the whole card is a link, with a "See all" cue in its header. */

import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import {
  Box,
  Paper,
  Stack,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { PHONE } from "../../lib/layout";

interface TitledCardProps {
  title: string;
  /** One line under the header row, in the secondary colour. */
  subtitle?: string;
  /**
   * Makes the whole card a link. Only for a card with data: an empty state
   * keeps its own button, and a button inside a link is invalid HTML.
   */
  to?: string;
  /** Right of the title: a CardAction cue or a control. */
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

// Content layout only; the look comes from the theme's card variants.
const frameSx = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2.5,
} as const;

export function TitledCard({
  title,
  subtitle,
  to,
  action,
  children,
  sx,
}: TitledCardProps) {
  const userSx = Array.isArray(sx) ? sx : [sx];
  const content = (
    <>
      {/* Title and subtitle are one block, the action another: a wide
          action (a segmented control on a phone) drops under both rather
          than splitting them or squeezing the title onto two lines. */}
      <Stack
        direction="row"
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{ fontWeight: 700, fontSize: "1.15rem", lineHeight: "36px" }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && (
          // Centred on the title's line, whatever the subtitle adds below.
          // On phones the slot takes whatever width its line leaves, so a
          // control that wraps under the title can span the card.
          <Box
            sx={{
              minHeight: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              [PHONE]: { flexGrow: 1 },
            }}
          >
            {action}
          </Box>
        )}
      </Stack>
      {children}
    </>
  );

  if (to) {
    return (
      <Paper
        component={RouterLink}
        to={to}
        aria-label={title}
        variant="clickableCard"
        sx={[frameSx, ...userSx]}
      >
        {content}
      </Paper>
    );
  }
  return (
    <Paper
      component="section"
      aria-label={title}
      variant="card"
      sx={[frameSx, ...userSx]}
    >
      {content}
    </Paper>
  );
}

/**
 * "See all" in a card header. Plain text, not a link: the card itself is
 * the link, and this only says where it goes. Always visible, darker when
 * the card is hovered or focused.
 */
export function CardAction({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      className="HomeCard-action"
      sx={{
        // body2, the size of the cards' secondary lines.
        fontSize: "0.875rem",
        color: "text.secondary",
        fontWeight: 500,
        whiteSpace: "nowrap",
        transition: "color 150ms",
      }}
    >
      {children}
    </Box>
  );
}

/** A card's body when its figures could not load: one sentence where the data was. */
export function CardProblem({ children }: { children: ReactNode }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", color: "text.secondary", flex: 1 }}
    >
      <ErrorOutlineIcon fontSize="small" sx={{ flexShrink: 0 }} />
      <Typography role="status">{children}</Typography>
    </Stack>
  );
}
