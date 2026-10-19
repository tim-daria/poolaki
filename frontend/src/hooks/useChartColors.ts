import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { lighten } from "@mui/material/styles";

/** How much the extra shades lighten by once the palette runs out. */
const MAX_LIGHTEN = 0.6;

export function useChartColors() {
  const { palette } = useTheme();

  return useMemo(() => {
    const base = palette.chart;
    return {
      /**
       * One colour per slice, in order. The theme's chart palette first, as on
       * the Overview; beyond it the last colour lightens by rank so a long
       * category list stays readable.
       */
      series: (count: number): string[] =>
        Array.from({ length: count }, (_, i) => {
          if (i < base.length) return base[i];
          const extra = count - base.length;
          const step = (i - base.length + 1) / extra;
          return lighten(base[base.length - 1], step * MAX_LIGHTEN);
        }),
      /** Ring colour when there is no data. */
      empty: palette.divider,
    };
  }, [palette]);
}
