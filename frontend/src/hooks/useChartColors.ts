import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { lighten } from "@mui/material/styles";

export function useChartColors() {
  const { palette } = useTheme();

  return useMemo(
    () => ({
      // Slice 0 is the darkest; the last one is ~80% lighter.
      shade: (index: number, count: number) => {
        if (count <= 1) return palette.primary.dark;
        // Cap lightness step at 0.55 so colors remain vibrant purple rather than turning grayish
        const factor = (index / (count - 1)) * 0.55;
        return lighten(palette.primary.dark, factor);
      },
      // Ring color when there is no data
      empty: palette.divider,
    }),
    [palette],
  );
}
