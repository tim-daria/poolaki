/**
 * @file Persistent page header with portal slots for the title and the page's
 * primary action, plus the helpers pages use to fill those slots.
 */
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link as RouterLink } from "react-router";
import {
  Box,
  Button,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
  type ButtonProps,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { PageHeaderContext, usePageHeaderSlots } from "./PageHeaderContext";
import { useRouteMeta } from "../../routeMeta";

const actionButtonSx = { px: 2.5, fontWeight: 700 } as const;

/** Matches the height of `PageActionButton` so the two sit on one line. */
const assistantButtonSize = 36.5;

interface PageHeaderProps {
  children: ReactNode;
  /** Optional until the assistant feature ships. */
  onAssistantClick?: () => void;
}

/**
 * Header that stays mounted across navigation; pages fill it via `PageTitle`,
 * `PageHeading` and `PageActionButton`. Slots are portal targets, not context
 * state: the action button closes over page state, so passing it up through
 * setState would go stale or re-render in a loop.
 */
export function PageHeader({ children, onAssistantClick }: PageHeaderProps) {
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
  const showAssistant = useRouteMeta()?.assistant ?? true;

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

          {showAssistant && (
            <Tooltip title="Ask AI">
              <IconButton
                aria-label="AI Assistant"
                onClick={onAssistantClick}
                sx={{
                  width: assistantButtonSize,
                  height: assistantButtonSize,
                  color: "primary.dark",
                  bgcolor: "primary.contrastText",
                  border: "1px solid",
                  borderColor: "primary.main",
                  "&:hover": { bgcolor: "primary.light" },
                }}
              >
                <AutoAwesomeOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {children}
    </PageHeaderContext.Provider>
  );
}

interface PageTitleProps {
  /** Defaults to the route's `handle` title. */
  title?: ReactNode;
  /** Defaults to the route's `handle` subtitle. */
  subtitle?: ReactNode;
  /** Link to the parent page, shown above the title on nested pages. */
  back?: { to: string; label: string };
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
export function PageTitle({ title, subtitle, back }: PageTitleProps) {
  const meta = useRouteMeta();
  const heading = title ?? meta?.title;
  const sub = subtitle ?? meta?.subtitle;

  return (
    <PageHeading>
      {back && (
        <Link
          component={RouterLink}
          to={back.to}
          underline="hover"
          sx={{
            color: "text.secondary",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            mb: 0.5,
          }}
        >
          <ChevronLeftIcon fontSize="small" />
          {back.label}
        </Link>
      )}
      <Typography variant="h2" component="h1" sx={{ lineHeight: 1.2 }}>
        {heading}
      </Typography>
      {sub && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {sub}
        </Typography>
      )}
    </PageHeading>
  );
}

/**
 * The page's primary action. Variant, icon and padding are header-owned so
 * pages stay consistent; all props remain overridable (`startIcon={null}`
 * removes the plus icon).
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
