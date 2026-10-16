/** @file Onboarding checklist shown on Home until every step is done or the banner is dismissed. */

import { Box, ButtonBase, IconButton, Stack, Typography } from "@mui/material";
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
    <Box
      component="section"
      aria-label="Set up your workspace"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 2,
        p: 2,
        pl: 3,
        borderRadius: 4,
        bgcolor: "primary.light",
      }}
    >
      <Box sx={{ flex: "1 1 200px" }}>
        <Typography sx={{ fontWeight: 700 }}>Set up your workspace</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {doneCount} of {steps.length} done · about 2 minutes
        </Typography>
      </Box>

      <Stack
        component="ol"
        direction={{ xs: "column", md: "row" }}
        sx={{ flex: "3 1 480px", gap: 1.5, listStyle: "none", m: 0, p: 0 }}
      >
        {steps.map((step, i) => (
          <Box component="li" key={step.label} sx={{ flex: 1, minWidth: 0 }}>
            <ButtonBase
              onClick={step.onClick}
              disabled={step.done}
              sx={{
                width: "100%",
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
      </Stack>

      <IconButton aria-label="Dismiss setup" onClick={onDismiss}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
