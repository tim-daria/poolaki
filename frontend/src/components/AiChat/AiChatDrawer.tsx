/** @file Right-hand chat surface for the AI assistant: message list, input,
 * send. An inline side panel on desktop — no Modal, so the page stays usable
 * and `aria-hidden` never touches `#root` — and a fullscreen temporary Drawer
 * on phones. */

import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { useAiChat } from "./useAiChat";
import { AiChatMessage } from "./AiChatMessage";

const panelWidth = 420;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiChatDrawer({ open, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { messages, sending, error, send, reset } = useAiChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

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
    <Box
      onKeyDown={onPanelKeyDown}
      sx={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
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
          <Typography sx={{ fontWeight: 700 }}>Ask AI</Typography>
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

  if (fullScreen) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        variant="temporary"
        // Unmount on close before focus returns to the trigger, so the
        // Modal's aria-hidden on #root never overlaps the restored focus
        // (Chrome's "Blocked aria-hidden" warning).
        ModalProps={{ closeAfterTransition: false }}
        slotProps={{ paper: { sx: { width: "100%" } } }}
      >
        {content}
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <Box
      component="aside"
      aria-label="AI assistant"
      sx={{
        width: panelWidth,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {content}
    </Box>
  );
}
