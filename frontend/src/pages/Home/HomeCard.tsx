/** @file Card frame shared by the Overview cards: optionally the whole card is a link, with a "See all" cue in its header. */

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
import { CARD_PADDING, cardLinkSx } from "./layout";

interface HomeCardProps {
  title: string;
  /**
   * Makes the whole card a link. Only for a card with data: an empty state
   * keeps its own button, and a button inside a link is invalid HTML.
   */
  to?: string;
  /** Right of the title: a HomeCardAction cue. */
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

const frameSx = {
  borderRadius: 4,
  p: CARD_PADDING,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2.5,
} as const;

export function HomeCard({ title, to, action, children, sx }: HomeCardProps) {
  const userSx = Array.isArray(sx) ? sx : [sx];
  const content = (
    <>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          minHeight: 36,
        }}
      >
        <Typography
          component="h2"
          sx={{ fontWeight: 700, fontSize: "1.15rem" }}
        >
          {title}
        </Typography>
        {action}
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
        elevation={0}
        sx={[frameSx, cardLinkSx, ...userSx]}
      >
        {content}
      </Paper>
    );
  }
  return (
    <Paper
      component="section"
      aria-label={title}
      elevation={0}
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
export function HomeCardAction({ children }: { children: ReactNode }) {
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
