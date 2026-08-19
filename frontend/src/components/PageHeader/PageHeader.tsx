import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Box, Button, Stack, Typography } from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { PageHeaderContext, usePageHeaderSlots } from "./PageHeaderContext";

interface PageHeaderProps {
  children: ReactNode;
  /**
   * Omitted until the assistant exists. The button then renders disabled
   * rather than dead-clickable, so the bar doesn't lie about what works.
   */
  onAssistantClick?: () => void;
}

/**
 * Persistent header for the page area: heading on the left, page action and
 * the AI Assistant button on the right.
 *
 * It renders once, above the routed page, and stays mounted across
 * navigation — pages fill it in rather than rebuilding it. That keeps the
 * Assistant button identical everywhere and keeps the left button next to the
 * state it drives: pages hand over content through `PageTitle` and
 * `PageAction`, which portal into the slots below.
 *
 * Portals, not context state, because the page action is a live element (it
 * opens the page's own modal). Pushing a node up through a setState would
 * either loop on every render or freeze a stale closure.
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
        {/* minWidth: 0 so a long heading wraps instead of pushing the
            buttons off the right edge. */}
        <Box ref={setTitleSlot} sx={{ minWidth: 0 }} />

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", flexShrink: 0 }}
        >
          <Box ref={setActionSlot} sx={{ display: "contents" }} />

          <Button
            variant="outlined"
            // color="inherit"
            startIcon={<AutoAwesomeOutlinedIcon />}
            // disabled={!onAssistantClick}
            onClick={onAssistantClick}
            sx={{
              color: "primary.dark",
              bgcolor: "primary.light",
              borderColor: "transparent",
              borderRadius: 999,
              px: 2.5,
              "&:hover": {
                bgcolor: "primary.light",
                borderColor: "primary.light",
              },
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
 * Fills the header's left side with arbitrary content, for the pages whose
 * heading is not a title — Home swaps in the member list on a shared
 * workspace. Renders nothing outside the app shell.
 */
export function PageHeading({ children }: { children: ReactNode }) {
  const slots = usePageHeaderSlots();
  if (!slots?.titleSlot) return null;

  return createPortal(children, slots.titleSlot);
}

/** The usual heading: a title, optionally over a subtitle. */
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
 * Fills the header's page-specific button slot, left of the AI Assistant.
 * Children stay owned by the page, so their handlers reach page state.
 */
export function PageAction({ children }: { children: ReactNode }) {
  const slots = usePageHeaderSlots();
  if (!slots?.actionSlot) return null;

  return createPortal(children, slots.actionSlot);
}
