/** @file Card frame and empty-state placeholder shapes shared by the Home page cards. */

import type { ReactNode } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";

interface HomeCardProps {
  title: string;
  /** Right of the title: a link or a chip. */
  aside?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function HomeCard({ title, aside, children, sx }: HomeCardProps) {
  return (
    <Paper
      component="section"
      aria-label={title}
      elevation={0}
      sx={[
        {
          borderRadius: 4,
          p: { xs: 2.5, sm: 3 },
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
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
        {aside}
      </Stack>
      {children}
    </Paper>
  );
}

/** Rounded grey bar standing in for text or a value in an empty card. */
export function PlaceholderBar({ sx }: { sx?: SxProps<Theme> }) {
  return (
    <Box
      aria-hidden
      sx={[
        { height: 12, borderRadius: 999, bgcolor: "primary.light" },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
