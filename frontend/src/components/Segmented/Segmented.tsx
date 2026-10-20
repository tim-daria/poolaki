/** @file Exclusive segmented control on the theme's ToggleButtonGroup look; hidden when printing. */

import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { PHONE, PRINT } from "../../lib/layout";

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedProps<T>) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      aria-label={ariaLabel}
      // Deselecting the active option yields null; a segmented control always has one selected.
      onChange={(_, next: T | null) => next && onChange(next)}
      sx={{
        borderRadius: 999,
        // Phones: fill the card header's action slot, options sharing it equally.
        [PHONE]: { width: "100%" },
        [PRINT]: { display: "none" },
      }}
    >
      {options.map((o) => (
        <ToggleButton
          key={o.value}
          value={o.value}
          sx={{
            textTransform: "none",
            px: 1.5,
            py: 0.5,
            // A label never wraps, so the control keeps one height everywhere.
            whiteSpace: "nowrap",
            [PHONE]: { flex: 1 },
          }}
        >
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
