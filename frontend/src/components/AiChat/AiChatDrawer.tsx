/** @file Right-hand chat surface for the AI assistant: message list, input,
 * send. Never a Modal: on desktop it is an inline flex sibling of the app
 * shell, on phones a fixed fullscreen overlay while AppLayout marks the shell
 * `inert`. No portal means `aria-hidden` never touches `#root`, so the
 * "Blocked aria-hidden" focus warning cannot occur. */

import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { useAiChat } from "./useAiChat";
import { AiChatMessage } from "./AiChatMessage";

const panelWidth = 420;

interface Props {
  open: boolean;
  /** Cover the viewport instead of sitting beside the page (phones). */
  fullScreen: boolean;
  onClose: () => void;
}

export function AiChatDrawer({ open, fullScreen, onClose }: Props) {
  const { messages, sending, error, send, reset } = useAiChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Remember what opened the panel and hand focus back when it closes, the
  // way a Modal would, since nothing else restores it for an inline panel.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    return () => openerRef.current?.focus();
  }, [open]);

  function handleClose() {
    onClose();
    reset();
  }

  function submit() {
    const value = inputRef.current?.value ?? "";
    if (!value.trim() || sending) return;
    if (send(value) && inputRef.current) inputRef.current.value = "";
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  /** The inline panel has no backdrop to click, so Escape closes it. */
  function onPanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") handleClose();
  }

  const content = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeOutlinedIcon fontSize="small" color="primary" />
          <Typography component="h2" sx={{ fontWeight: 700 }}>
            AI Assistant
          </Typography>
        </Box>
        <IconButton
          aria-label="Close assistant"
          onClick={handleClose}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {messages.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Ask about your transactions, goals or budget.
          </Typography>
        )}
        {messages.map((m) => (
          <AiChatMessage key={m.id} message={m} />
        ))}
        {sending && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Thinking…
            </Typography>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          gap: 1,
          p: 2,
          // Clear the home indicator when the panel covers a phone screen.
          pb: fullScreen ? "max(16px, env(safe-area-inset-bottom))" : 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Ask a question…"
          onKeyDown={onInputKeyDown}
          disabled={sending}
          autoFocus
        />
        <IconButton
          aria-label="Send"
          onClick={submit}
          disabled={sending}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );

  if (!open) return null;

  return (
    <Box
      component="aside"
      // Fullscreen it behaves as a dialog: the shell behind it is inert, so
      // announce it as modal. Beside the page it is just a landmark.
      role={fullScreen ? "dialog" : undefined}
      aria-modal={fullScreen ? true : undefined}
      aria-label="AI assistant"
      onKeyDown={onPanelKeyDown}
      sx={[
        {
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          bgcolor: "background.paper",
        },
        fullScreen
          ? { position: "fixed", inset: 0, zIndex: "drawer" }
          : {
              width: panelWidth,
              flexShrink: 0,
              borderLeft: "1px solid",
              borderColor: "divider",
            },
      ]}
    >
      {content}
    </Box>
  );
}
