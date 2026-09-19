/** @file Label rendered above a form control, in place of MUI's floating label. */

import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface FieldLabelProps {
  label: string;
  /** Renders a muted "(optional)" after the label. */
  optional?: boolean;
  /** The `id` of the control below, so clicking the label focuses it. */
  htmlFor?: string;
  /**
   * Id for the label itself. Needed by a MUI select, whose visible control is
   * a div that `htmlFor` cannot reach: pass the same value as its `labelId`.
   */
  id?: string;
  children: ReactNode;
}

/** Pass a matching `htmlFor` / `id` and omit the control's own `label` prop. */
export function FieldLabel({
  label,
  optional,
  htmlFor,
  id,
  children,
}: FieldLabelProps) {
  return (
    <Box
      sx={{
        // The control fills the row whatever its own width default is.
        "& > .MuiFormControl-root": { width: "100%" },
      }}
    >
      <Typography
        component="label"
        htmlFor={htmlFor}
        id={id}
        sx={{
          display: "block",
          mb: 0.75,
          fontWeight: 700,
          fontSize: "0.85rem",
          color: "text.primary",
        }}
      >
        {label}
        {optional && (
          <Box
            component="span"
            sx={{ ml: 0.5, fontWeight: 400, color: "text.secondary" }}
          >
            (optional)
          </Box>
        )}
      </Typography>
      {children}
    </Box>
  );
}
