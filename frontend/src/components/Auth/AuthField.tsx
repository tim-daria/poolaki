/** @file Labelled text input for the signed-out (auth) pages. */
import type { ReactNode } from "react";
import { Box, TextField, Typography, type TextFieldProps } from "@mui/material";
import { useTextInput, type TextCasing } from "../Form/useTextInput";

type AuthFieldProps = Omit<
  TextFieldProps,
  "label" | "variant" | "id" | "value" | "onChange"
> & {
  label: string;
  /** Required: the caption is an external `<label>` and needs a target. */
  id: string;
  /** Rendered at the right end of the label row. */
  action?: ReactNode;
  value: string;
  /** Receives the value, not the change event. */
  onChange: (value: string) => void;
  /** Casing rule applied to the value. Omit to keep input verbatim (e.g. passwords). */
  casing?: TextCasing;
};

/**
 * Uppercase caption label above a borderless filled input. Separate from
 * `FieldLabel` because the label row here may carry a trailing action.
 */
export function AuthField({
  label,
  id,
  action,
  value,
  onChange,
  casing,
  sx,
  ...rest
}: AuthFieldProps) {
  // Hooks must run unconditionally; the result is discarded when no casing is set.
  const { autoCapitalize, spellCheck, ...cased } = useTextInput({
    value,
    onChange,
    casing: casing ?? "name",
  });
  const field = casing
    ? cased
    : {
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value),
      };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 1,
          mb: 0.75,
        }}
      >
        <Typography
          component="label"
          htmlFor={id}
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
        {action}
      </Box>

      <TextField
        {...rest}
        {...field}
        id={id}
        variant="filled"
        // The caption above is the label; no floating label is rendered.
        hiddenLabel
        fullWidth
        sx={[
          {
            "& .MuiFilledInput-root": {
              borderRadius: 1.5,
              bgcolor: "background.default",
              "&:hover, &.Mui-focused": { bgcolor: "background.default" },
            },
            "& .MuiFilledInput-input": { py: 1.5 },
            // Remove the helper-text indent meant to clear a floating label.
            "& .MuiFormHelperText-root": { mx: 0 },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        slotProps={{
          ...rest.slotProps,
          input: { disableUnderline: true, ...rest.slotProps?.input },
          htmlInput: {
            ...(casing ? { autoCapitalize, spellCheck } : {}),
            ...rest.slotProps?.htmlInput,
          },
        }}
      />
    </Box>
  );
}
