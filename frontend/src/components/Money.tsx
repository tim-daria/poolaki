/** @file Inline span for monetary values: inherits size and colour, forces the mono font. */

import { Box, type SxProps, type Theme } from "@mui/material";

interface MoneyProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
  /** For a figure shown abbreviated: the exact amount for assistive tech and the tooltip. */
  "aria-label"?: string;
  title?: string;
}

export function Money({
  children,
  sx,
  className,
  "aria-label": ariaLabel,
  title,
}: MoneyProps) {
  return (
    <Box
      component="span"
      className={className}
      aria-label={ariaLabel}
      title={title}
      sx={[
        { fontFamily: (t) => t.typography.mono.fontFamily },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
