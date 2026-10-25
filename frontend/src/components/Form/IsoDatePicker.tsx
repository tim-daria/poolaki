/**
 * @file DatePicker whose value is the ISO "YYYY-MM-DD" string the API and
 * filters use. Every date field goes through it, so the display format is
 * set once here. A date the picker flags (half-typed year, outside
 * minDate/maxDate) stays visible in the field but is reported as "".
 */

import { useState } from "react";
import { DatePicker, type DatePickerProps } from "@mui/x-date-pickers";
import dayjs, { type Dayjs } from "dayjs";
import { isoFromPicker, pickerHint } from "./isoFromPicker";

type IsoDatePickerProps = Omit<DatePickerProps, "value" | "onChange"> & {
  /** "YYYY-MM-DD", or "" when empty. */
  value: string;
  /** "" when the field is cleared, holds an invalid date, or one the picker flags. */
  onChange: (iso: string) => void;
  /**
   * Id of an external label, for a picker under a FieldLabel instead of its
   * own floating `label`. MUI names the field's group only from its own
   * label, so this wires the name through the input slot.
   */
  labelId?: string;
};

export function IsoDatePicker({
  value,
  onChange,
  labelId,
  slotProps,
  ...rest
}: IsoDatePickerProps) {
  /**
   * The field's own value, kept apart from `value`: a flagged date reports ""
   * upward, and if the field were bound to that "" MUI would clear the
   * sections mid-typing. Re-synced only when the parent sets a value this
   * picker did not itself report (a preset, Clear, or a modal reseed).
   */
  const [local, setLocal] = useState<Dayjs | null>(() =>
    value ? dayjs(value) : null,
  );
  const [lastReported, setLastReported] = useState(value);
  if (value !== lastReported) {
    setLastReported(value);
    setLocal(value ? dayjs(value) : null);
  }

  /** Why the typed date was reported as "", for the helper line. */
  const [hint, setHint] = useState<string | undefined>(undefined);

  return (
    <DatePicker
      format="DD-MM-YYYY"
      {...rest}
      slotProps={{
        ...slotProps,
        textField: {
          helperText: hint,
          ...slotProps?.textField,
          ...(labelId && {
            slotProps: { input: { "aria-labelledby": labelId } },
          }),
        },
      }}
      value={local}
      onChange={(d, context) => {
        setLocal(d);
        const iso = isoFromPicker(d, context.validationError);
        setHint(pickerHint(context.validationError));
        setLastReported(iso);
        onChange(iso);
      }}
    />
  );
}
