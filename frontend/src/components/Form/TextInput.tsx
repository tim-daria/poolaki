/** @file MUI TextField wrapper around useTextInput; all behaviour lives in the hook. */

import { TextField, type TextFieldProps } from "@mui/material";
import { useTextInput, type TextCasing } from "./useTextInput";

type TextInputProps = Omit<TextFieldProps, "value" | "onChange"> & {
  value: string;
  /** Receives the text, not the event: the field has already read it. */
  onChange: (value: string) => void;
  /** Required, not defaulted: each field states which casing it holds. */
  casing: TextCasing;
};

export function TextInput({
  value,
  onChange,
  casing,
  onBlur,
  slotProps,
  ...rest
}: TextInputProps) {
  const { autoCapitalize, spellCheck, ...field } = useTextInput({
    value,
    onChange,
    casing,
  });

  return (
    <TextField
      {...rest}
      {...field}
      onBlur={(e) => {
        field.onBlur();
        onBlur?.(e);
      }}
      slotProps={{
        ...slotProps,
        htmlInput: { autoCapitalize, spellCheck, ...slotProps?.htmlInput },
      }}
    />
  );
}
