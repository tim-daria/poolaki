/** @file The picker-value-to-ISO decision for IsoDatePicker; a plain function so it can be tested without MUI. */

import type { DateValidationError } from "@mui/x-date-pickers";
import type { Dayjs } from "dayjs";

/**
 * A partial year like "202" is a valid dayjs date, so `isValid()` alone would
 * commit it; MUI's validation (default bounds 1900–2099, plus any
 * minDate/maxDate) is what rejects it.
 */
export function isoFromPicker(
  d: Dayjs | null,
  error: DateValidationError,
): string {
  return d?.isValid() && error === null ? d.format("YYYY-MM-DD") : "";
}

/**
 * Helper text for a date a bound rejects. Only `disableFuture` and
 * `disablePast` are named: rules a form opts into, so the field should say
 * why. The others (a half-typed year trips `minDate`) stay silent, as the red
 * outline is enough while typing.
 */
export function pickerHint(error: DateValidationError): string | undefined {
  switch (error) {
    case "disableFuture":
      return "Cannot be in the future.";
    case "disablePast":
      return "Cannot be in the past.";
    default:
      return undefined;
  }
}
