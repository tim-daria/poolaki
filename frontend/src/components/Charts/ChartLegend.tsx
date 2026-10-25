/** @file Legend list for the chart components: a colour square and a label per series. */

import { Box, Stack, Typography } from "@mui/material";

export interface LegendItem {
  label: string;
  color: string;
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <Stack
      component="ul"
      direction="row"
      sx={{ listStyle: "none", m: 0, p: 0, gap: 2, flexWrap: "wrap" }}
    >
      {items.map((item) => (
        <Stack
          component="li"
          key={item.label}
          direction="row"
          spacing={1}
          sx={{ alignItems: "center" }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 0.75,
              flexShrink: 0,
              bgcolor: item.color,
            }}
          />
          <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
