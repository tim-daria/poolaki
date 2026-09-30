/** @file Right-hand drawer for the AI assistant: message list, input, send. */

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

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiChatDrawer({ open, onClose }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { messages, sending, error, send, reset } = useAiChat();
  const inputRef = useRef<HTMLInputElement>(null);
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
    void send(value);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      variant="temporary"
      slotProps={{ paper: { sx: { width: fullScreen ? "100%" : 420 } } }}
    >
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
            <Typography sx={{ fontWeight: 700 }}>Ask AI</Typography>
          </Box>
          <IconButton aria-label="Close assistant" onClick={handleClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
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

        <Box sx={{ display: "flex", gap: 1, p: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Ask a question…"
            onKeyDown={onKeyDown}
            disabled={sending}
          />
          <IconButton aria-label="Send" onClick={submit} disabled={sending} color="primary">
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
}