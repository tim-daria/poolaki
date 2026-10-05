/** @file Building blocks shared by the Settings pages: card, labelled row, and the "coming soon" wrapper. */

import type { ReactElement, ReactNode } from "react";
import { Box, Paper, Stack, Tooltip, Typography } from "@mui/material";

export function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3.5 }, minWidth: 0 }}
    >
      {children}
    </Paper>
  );
}

interface SettingsRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Plain bold label rather than a section heading. */
  titleVariant?: "section" | "label";
}

/** Title and subtitle on the left, one control on the right; wraps on narrow screens. */
export function SettingsRow({
  title,
  subtitle,
  action,
  titleVariant = "label",
}: SettingsRowProps) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component={titleVariant === "section" ? "h2" : "h3"}
          sx={{
            fontWeight: 700,
            fontSize: titleVariant === "section" ? "1.15rem" : "1rem",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}

/**
 * Wraps a control whose backend route doesn't exist yet. The span is needed
 * because a disabled button fires no pointer events, so the tooltip would
 * never open on it directly.
 */
export function ComingSoon({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactElement;
}) {
  if (enabled) return children;
  return (
    <Tooltip title="Coming soon">
      <span>{children}</span>
    </Tooltip>
  );
}
