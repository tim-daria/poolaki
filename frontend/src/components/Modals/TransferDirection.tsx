/** @file Which way a saving moves: into the goal from the balance, or back out. Two card-like toggle buttons. */

import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { PHONE } from "../../lib/layout";

export type Direction = "contribution" | "withdraw";

const OPTIONS: {
  value: Direction;
  title: string;
  note: string;
  Icon: typeof ArrowDownwardIcon;
}[] = [
  {
    value: "contribution",
    title: "Add to goal",
    note: "from your balance",
    Icon: ArrowDownwardIcon,
  },
  {
    value: "withdraw",
    title: "Withdraw",
    note: "back to your balance",
    Icon: ArrowUpwardIcon,
  },
];

interface Props {
  value: Direction;
  onChange: (value: Direction) => void;
  /** Edit mode: a row keeps its type for life. */
  disabled: boolean;
}

export function TransferDirection({ value, onChange, disabled }: Props) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      disabled={disabled}
      // Null when the pressed card was already selected; ignoring it keeps one card always on.
      onChange={(_, next: Direction | null) => next && onChange(next)}
      aria-label="Direction"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 2,
        // Not a segmented control: no track behind the cards.
        bgcolor: "transparent",
        p: 0,
        "& .MuiToggleButtonGroup-grouped": {
          border: "2px solid",
          borderColor: "divider",
          borderRadius: 2,
          m: 0,
          p: 1.5,
          justifyContent: "flex-start",
          textAlign: "left",
          // Title only on a phone (icon and note hidden below), so it centres.
          [PHONE]: { justifyContent: "center", textAlign: "center" },
          textTransform: "none",
          "&.Mui-selected": {
            borderColor: "primary.main",
            borderWidth: 2,
            bgcolor: "background.default",
            color: "text.primary",
            "&:hover": { bgcolor: "background.default" },
          },
        },
      }}
    >
      {OPTIONS.map(({ value: v, title, note, Icon }) => (
        <ToggleButton key={v} value={v}>
          {/* Decorative: the title names the option. */}
          <Box
            aria-hidden
            sx={{
              display: "flex",
              [PHONE]: { display: "none" },
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "primary.light",
              color: "primary.dark",
              mr: 1.5,
              flexShrink: 0,
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Box>
            <Typography
              sx={{ fontWeight: 700, lineHeight: 1.2, color: "text.primary" }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", [PHONE]: { display: "none" } }}
            >
              {note}
            </Typography>
          </Box>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
