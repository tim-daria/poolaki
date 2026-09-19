/** @file Inline span for monetary values: inherits size and colour, forces the mono font. */

import { Box, type SxProps, type Theme } from "@mui/material";

interface MoneyProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}

export function Money({ children, sx, className }: MoneyProps) {
  return (
    <Box
      component="span"
      className={className}
      sx={[
        { fontFamily: (t) => t.typography.mono.fontFamily },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
