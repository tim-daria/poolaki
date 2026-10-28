/** @file Label rendered above a form control, in place of MUI's floating label. */

import { Box, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { ReactNode } from "react";

interface FieldLabelProps {
  label: string;
  /** Renders a muted "(optional)" after the label. */
  optional?: boolean;
  /** A rule the field follows, behind an info icon next to the label. */
  info?: string;
  /** Right-aligned on the label row: a small text action such as "Remove". */
  action?: ReactNode;
  /** The `id` of the control below, so clicking the label focuses it. */
  htmlFor?: string;
  /**
   * Id for the label itself. For a MUI select pass this as its `labelId` and
   * omit `htmlFor`: the select's visible control is a div, which a label's
   * `for` cannot reach, and Chrome flags a `for` that points at one.
   */
  id?: string;
  children: ReactNode;
}

/** Pass a matching `htmlFor` / `id` and omit the control's own `label` prop. */
export function FieldLabel({
  label,
  optional,
  info,
  action,
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 0.75,
        }}
      >
        <Typography
          component="label"
          htmlFor={htmlFor}
          id={id}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            fontWeight: 700,
            fontSize: "0.85rem",
            color: "text.primary",
          }}
        >
          {label}
          {optional && (
            <Box
              component="span"
              sx={{ fontWeight: 400, color: "text.secondary" }}
            >
              (optional)
            </Box>
          )}
          {info && (
            <Tooltip title={info} arrow>
              {/* Focusable so the rule is reachable from the keyboard; the
                  aria-label carries it for screen readers without hovering. */}
              <Box
                component="span"
                tabIndex={0}
                role="note"
                aria-label={info}
                sx={{
                  display: "inline-flex",
                  color: "text.secondary",
                  cursor: "help",
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    borderRadius: "50%",
                  },
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: "1rem" }} />
              </Box>
            </Tooltip>
          )}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}
