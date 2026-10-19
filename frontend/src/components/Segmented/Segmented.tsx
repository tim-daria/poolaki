/** @file Exclusive segmented control on the theme's ToggleButtonGroup look; hidden when printing. */

import { ToggleButton, ToggleButtonGroup } from "@mui/material";

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
      sx={{ borderRadius: 999, "@media print": { display: "none" } }}
    >
      {options.map((o) => (
        <ToggleButton
          key={o.value}
          value={o.value}
          sx={{ textTransform: "none", px: 1.5, py: 0.5 }}
        >
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
