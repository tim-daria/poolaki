/**
 * @file MUI TextField wrapper around useMoneyField. All behaviour lives in the
 * hook; this only supplies the markup and the mono input font.
 */

import { TextField, type TextFieldProps, type Theme } from "@mui/material";
import { useMoneyField, type MoneyFieldOptions } from "./useMoneyField";

// Same mono face as <Money> so typed and rendered amounts match. Applied here,
// not per call site, so every amount field gets it. Theme callback because
// `mono` is a custom typography variant.
const monoInput = {
  "& input": { fontFamily: (t: Theme) => t.typography.mono.fontFamily },
};

type MoneyFieldProps = Omit<TextFieldProps, "value" | "onChange" | "type"> &
  MoneyFieldOptions;

/**
 * Amount input. Not type="number": it cannot hold grouped text, returns "" for
 * unparseable input, and changes value on scroll.
 */
export function MoneyField({
  value,
  onChange,
  locale,
  slotProps,
  sx,
  ...rest
}: MoneyFieldProps) {
  const { inputMode, ...field } = useMoneyField({ value, onChange, locale });

  return (
    <TextField
      {...rest}
      {...field}
      sx={[monoInput, ...(Array.isArray(sx) ? sx : [sx])]}
      slotProps={{
        ...slotProps,
        htmlInput: { inputMode, ...slotProps?.htmlInput },
      }}
    />
  );
}
