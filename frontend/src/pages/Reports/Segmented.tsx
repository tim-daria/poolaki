import { ToggleButton, ToggleButtonGroup } from "@mui/material";

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next: T | null) => next && onChange(next)}
      sx={{ "@media print": { display: "none" } }}
    >
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value} sx={{ textTransform: "none", px: 1.5, py: 0.5 }}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}