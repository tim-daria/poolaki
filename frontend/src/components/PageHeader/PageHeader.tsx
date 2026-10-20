/**
 * @file Persistent page header with portal slots for the title and the page's
 * primary action, plus the helpers pages use to fill those slots.
 */
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link as RouterLink } from "react-router";
import { Box, Button, Link, Typography, type ButtonProps } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { PageHeaderContext, usePageHeaderSlots } from "./PageHeaderContext";
import { useRouteMeta } from "../../routeMeta";
import { PRINT } from "../../lib/layout";

const actionButtonSx = { px: 2.5, fontWeight: 700 } as const;

/** Mobile action button height and, collapsed, its diameter. */
const FAB_SIZE = 48;

/** Floating over the page it needs the lift a flat in-bar button does not. */
const fabSx = {
  height: FAB_SIZE,
  bgcolor: "primary.dark",
  "&:hover": { bgcolor: "primary.main" },
  boxShadow: "0 8px 24px -8px var(--mui-palette-shadow-main)",
  transition: "padding 200ms",
  // Collapsed: a 48px disc around the plus; the label clips to nothing but
  // stays in the DOM so the accessible name does not change.
  "[data-collapsed] > &": {
    px: 0,
    minWidth: FAB_SIZE,
    "& .MuiButton-startIcon": { m: 0 },
    "& .fab-label": { gridTemplateColumns: "0fr", opacity: 0 },
  },
} as const;

/** A grid track animates to the label's true width; width: auto cannot. */
const fabLabelSx = {
  display: "grid",
  gridTemplateColumns: "1fr",
  transition: "grid-template-columns 200ms, opacity 150ms",
  "& > span": { overflow: "hidden", minWidth: 0, whiteSpace: "nowrap" },
} as const;

interface PageHeaderProps {
  children: ReactNode;
  /** Phones: where the page action floats instead of sitting in this bar. */
  fabSlot?: HTMLElement | null;
}

/**
 * Header that stays mounted across navigation; pages fill it via `PageTitle`,
 * `PageHeading` and `PageActionButton`. Slots are portal targets, not context
 * state: the action button closes over page state, so passing it up through
 * setState would go stale or re-render in a loop.
 */
export function PageHeader({ children, fabSlot = null }: PageHeaderProps) {
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);

  return (
    <PageHeaderContext.Provider value={{ titleSlot, actionSlot, fabSlot }}>
      <Box
        component="header"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          p: 3,
          [PRINT]: { display: "none" },
        }}
      >
        {/* minWidth: 0 lets a long heading wrap instead of overflowing. */}
        <Box ref={setTitleSlot} sx={{ minWidth: 0 }} />

        {/* The slot is the flex row itself and vanishes when nothing is
            portaled in: an empty item would still wrap under a long
            title and add the row gap beneath it. */}
        <Box
          ref={setActionSlot}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexShrink: 0,
            "&:empty": { display: "none" },
          }}
        />
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
export function PageActionButton({ sx, children, ...props }: ButtonProps) {
  const slots = usePageHeaderSlots();
  const target = slots?.fabSlot ?? slots?.actionSlot;
  if (!target) return null;
  const floating = Boolean(slots?.fabSlot);

  return createPortal(
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      {...props}
      sx={[
        actionButtonSx,
        floating && fabSx,
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {floating ? (
        <Box component="span" className="fab-label" sx={fabLabelSx}>
          <span>{children}</span>
        </Box>
      ) : (
        children
      )}
    </Button>,
    target,
  );
}
