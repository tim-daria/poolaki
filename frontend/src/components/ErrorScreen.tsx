/** @file Centred card for terminal screens (route errors, missing or unreachable workspaces). */

import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";

interface ErrorScreenProps {
  /** Small uppercase line above the heading, e.g. "Error 404". */
  eyebrow?: string;
  title: string;
  /** Body copy. */
  children: ReactNode;
  /** Pill Buttons; rendered in a wrapping, centred row. */
  actions?: ReactNode;
  role?: "alert";
}

/**
 * Same geometry as AuthLayout's card so the two lone-card pages read as one
 * family. `flex: 1` fills #root on a full page and <main> inside the shell.
 */
export function ErrorScreen({
  eyebrow,
  title,
  children,
  actions,
  role,
}: ErrorScreenProps) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 6,
        bgcolor: "primary.light",
      }}
    >
      <Paper
        role={role}
        variant="card"
        sx={{
          width: "100%",
          maxWidth: 460,
          p: { xs: 3, sm: 5 },
          textAlign: "center",
          // Like the auth card, it floats: it is alone on its page.
          boxShadow: (t) => `0 24px 60px -32px ${t.palette.shadow.main}`,
        }}
      >
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <Box
            aria-hidden
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "primary.light",
              color: "primary.main",
            }}
          >
            <ErrorOutlineIcon />
          </Box>
          {eyebrow && (
            <Typography variant="label" sx={{ color: "text.secondary" }}>
              {eyebrow}
            </Typography>
          )}
          <Typography variant="h2" component="h2" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>{children}</Typography>
          {actions && (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ flexWrap: "wrap", justifyContent: "center", mt: 1 }}
            >
              {actions}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
