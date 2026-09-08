/**
 * @file Persistent page header with portal slots for the title and the page's
 * primary action, plus the helpers pages use to fill those slots.
 */
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Button,
  Stack,
  Typography,
  type ButtonProps,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { PageHeaderContext, usePageHeaderSlots } from "./PageHeaderContext";

/** Shared by both header buttons so they stay visually consistent. */
const actionButtonSx = { px: 2.5, fontWeight: 700 } as const;

interface PageHeaderProps {
  children: ReactNode;
  /** Optional until the assistant feature ships. */
  onAssistantClick?: () => void;
}

/**
 * Header that stays mounted across navigation; pages fill it via `PageTitle`
 * and `PageAction`. Slots are exposed as portal targets rather than context
 * state because the page action holds handlers over page state, and lifting
 * a React node through setState would re-render in a loop or go stale.
 */
export function PageHeader({ children, onAssistantClick }: PageHeaderProps) {
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);

  return (
    <PageHeaderContext.Provider value={{ titleSlot, actionSlot }}>
      <Box
        component="header"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          p: 3,
        }}
      >
        {/* minWidth: 0 lets a long heading wrap instead of overflowing. */}
        <Box ref={setTitleSlot} sx={{ minWidth: 0 }} />

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", flexShrink: 0 }}
        >
          <Box ref={setActionSlot} sx={{ display: "contents" }} />

          <Button
            variant="outlined"
            startIcon={<AutoAwesomeOutlinedIcon />}
            // disabled={!onAssistantClick}
            onClick={onAssistantClick}
            sx={{
              ...actionButtonSx,
              color: "primary.dark",
              bgcolor: "primary.contrastText",
              border: "1px solid",
              borderColor: "primary.main",
              "&:hover": { bgcolor: "primary.light" },
            }}
          >
            AI Assistant
          </Button>
        </Stack>
      </Box>

      {children}
    </PageHeaderContext.Provider>
  );
}

interface PageTitleProps {
  title: ReactNode;
  subtitle?: ReactNode;
}

/**
 * Portals arbitrary content into the header's title slot. Renders nothing
 * when mounted outside `PageHeader`.
 */
export function PageHeading({ children }: { children: ReactNode }) {
  const slots = usePageHeaderSlots();
  if (!slots?.titleSlot) return null;

  return createPortal(children, slots.titleSlot);
}

/** Standard heading: a title with an optional subtitle. */
export function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <PageHeading>
      <Typography variant="h2" component="h1" sx={{ lineHeight: 1.2 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </PageHeading>
  );
}

/**
 * The page's primary action with header-owned variant, icon and padding so
 * pages cannot drift apart. All props remain overridable, e.g.
 * `startIcon={null}` removes the plus icon.
 */
export function PageActionButton({ sx, ...props }: ButtonProps) {
  const slots = usePageHeaderSlots();
  if (!slots?.actionSlot) return null;

  return createPortal(
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      {...props}
      sx={[actionButtonSx, ...(Array.isArray(sx) ? sx : [sx])]}
    />,
    slots.actionSlot,
  );
}
