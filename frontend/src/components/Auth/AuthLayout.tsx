/** @file Page shell for the signed-out (auth) pages: brand line, centred card, optional footer. */
import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

interface AuthLayoutProps {
  /** Muted line rendered under the card. */
  footer?: ReactNode;
  children: ReactNode;
}

/** Card width is capped so every auth page renders at the same width regardless of content. */
export function AuthLayout({ footer, children }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: "primary.light",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        px: 2,
        py: 6,
      }}
    >
      {/* Baseline alignment keeps the tagline on the wordmark's text line. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
        <Typography
          component="span"
          sx={{
            fontSize: "2rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "primary.dark",
          }}
        >
          Poolaki
        </Typography>
        <Typography component="span" sx={{ color: "text.secondary" }}>
          Know your money
        </Typography>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 460,
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          boxShadow: "0 24px 60px -32px rgba(28, 26, 32, 0.35)",
        }}
      >
        {children}
      </Paper>

      {footer && (
        <Typography
          sx={{
            maxWidth: 460,
            textAlign: "center",
            fontSize: "0.8rem",
            color: "text.secondary",
          }}
        >
          {footer}
        </Typography>
      )}
    </Box>
  );
}
