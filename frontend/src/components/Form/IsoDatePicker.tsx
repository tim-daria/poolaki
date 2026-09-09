/**
 * @file DatePicker whose value is the ISO "YYYY-MM-DD" string the API and
 * filters use. Every date field goes through it, so the display format is
 * set once here.
 */

import { DatePicker, type DatePickerProps } from "@mui/x-date-pickers";
import dayjs from "dayjs";

type IsoDatePickerProps = Omit<DatePickerProps, "value" | "onChange"> & {
  /** "YYYY-MM-DD", or "" when empty. */
  value: string;
  /** "" when the field is cleared or holds an invalid date. */
  onChange: (iso: string) => void;
};

export function IsoDatePicker({
  value,
  onChange,
  ...rest
}: IsoDatePickerProps) {
  return (
    <DatePicker
      format="DD-MM-YYYY"
      {...rest}
      value={value ? dayjs(value) : null}
      onChange={(d) => onChange(d?.isValid() ? d.format("YYYY-MM-DD") : "")}
    />
  );
}
