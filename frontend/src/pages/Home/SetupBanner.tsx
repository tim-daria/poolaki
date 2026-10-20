/** @file Onboarding checklist shown on Home until every step is done or the banner is dismissed. */

import {
  alpha,
  Box,
  ButtonBase,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

export interface SetupStep {
  label: string;
  done: boolean;
  onClick: () => void;
}

interface Props {
  steps: SetupStep[];
  onDismiss: () => void;
}

export function SetupBanner({ steps, onDismiss }: Props) {
  const doneCount = steps.filter((s) => s.done).length;

  return (
    // The card variant gives it the cards' padding and radius, so the tiles
    // share a left edge with the card below.
    <Paper
      variant="card"
      component="section"
      aria-label="Set up your workspace"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 2,
        // The page itself is primary.light, so the panel needs a step deeper
        // to read as a surface; the secondary tint at low alpha keeps it soft.
        bgcolor: (theme) => alpha(theme.palette.secondary.light, 0.3),
      }}
    >
      <Box sx={{ flex: "1 1 200px" }}>
        <Typography sx={{ fontWeight: 700 }}>Set up your workspace</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {doneCount} of {steps.length} done · about 2 minutes
        </Typography>
      </Box>

      {/* A grid, so the tiles share one width and one height at every size. */}
      <Box
        component="ol"
        sx={{
          flex: "3 1 480px",
          flexBasis: { xs: "100%", md: 480 },
          // On narrow screens the list wraps under the header and the X stays on the header line.
          order: { xs: 2, md: 0 },
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: `repeat(${steps.length}, minmax(0, 1fr))`,
          },
          gap: 1.5,
          listStyle: "none",
          m: 0,
          p: 0,
        }}
      >
        {steps.map((step, i) => (
          <Box component="li" key={step.label} sx={{ minWidth: 0 }}>
            <ButtonBase
              onClick={step.onClick}
              disabled={step.done}
              sx={{
                width: "100%",
                height: "100%",
                minHeight: 56,
                justifyContent: "flex-start",
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderRadius: 3,
                bgcolor: "background.paper",
                textAlign: "left",
                "&:hover": {
                  boxShadow: "0 0 0 1px var(--mui-palette-primary-main)",
                },
                "&.Mui-focusVisible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                },
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "1px solid",
                  borderColor: step.done ? "primary.dark" : "secondary.light",
                  bgcolor: step.done ? "primary.dark" : "transparent",
                  color: step.done ? "primary.contrastText" : "text.primary",
                }}
              >
                {step.done ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
              </Box>
              <Typography
                sx={{
                  fontWeight: 500,
                  color: step.done ? "text.secondary" : "text.primary",
                  textDecoration: step.done ? "line-through" : "none",
                }}
              >
                {step.label}
              </Typography>
            </ButtonBase>
          </Box>
        ))}
      </Box>

      <IconButton
        aria-label="Dismiss setup"
        onClick={onDismiss}
        size="small"
        // Pulled into the corner by its own padding, so it sits on the edge
        // of the content box rather than inset by a button's worth of space.
        sx={{ ml: "auto", alignSelf: "flex-start", mt: -1, mr: -1 }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}
