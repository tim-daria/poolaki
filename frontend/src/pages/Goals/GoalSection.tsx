/** @file Foldable section of goal cards: an overline heading that toggles the grid beneath it. */

import { useId, useState, type ReactNode } from "react";
import { Box, ButtonBase, Collapse, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(300px, 1fr))",
  gap: 2,
} as const;

interface Props {
  /** Heading text; also the toggle button's accessible name. */
  title: string;
  /** Accessible name of the card region, e.g. "Active goals". */
  ariaLabel: string;
  defaultOpen: boolean;
  children: ReactNode;
}

/** Folds independently; nothing remembers the state across page loads. */
export function GoalSection({
  title,
  ariaLabel,
  defaultOpen,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <Box>
      <ButtonBase
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        sx={{ gap: 0.5, mb: 1, borderRadius: 1 }}
      >
        {/* sx, not the color prop: MUI 9's Typography resolves only named
            colours through the prop, not palette paths. */}
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          {title}
        </Typography>
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: "text.secondary",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
          }}
        />
      </ButtonBase>
      <Collapse in={open}>
        <Box
          id={panelId}
          component="section"
          aria-label={ariaLabel}
          sx={cardGrid}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
