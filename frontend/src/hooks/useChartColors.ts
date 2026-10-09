import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { lighten } from "@mui/material/styles";

export function useChartColors() {
  const { palette } = useTheme();

  return useMemo(
    () => ({
      // Slice 0 is the darkest; the last one is ~80% lighter.
      shade: (index: number, count: number) =>
        lighten(palette.primary.dark, count <= 1 ? 0 : (index / (count - 1)) * 0.8),
      // Ring color when there is no data
      empty: palette.divider,
    }),
    [palette],
  );
}