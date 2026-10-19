/** @file Drawer for the AI assistant: message list, input, send. A right
 * drawer on desktop, a bottom sheet on phones (useSheet). Focus handling as every overlay: `useRestoreFocus` keeps focus out of the
 * `aria-hidden` shell on both edges of the Drawer's life. */

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { useRestoreFocus } from "../../hooks/useRestoreFocus";
import { useSheet } from "../../hooks/useSheet";
import { useAiChat } from "./useAiChat";
import { AiChatMessage } from "./AiChatMessage";

const panelWidth = 420;
/** The sheet leaves most of the page readable while the answer is in view. */
const sheetHeight = "40dvh";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiChatDrawer({ open, onClose }: Props) {
  const { messages, sending, error, send, reset } = useAiChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const restoreFocus = useRestoreFocus(open);
  const { anchor, paperSx } = useSheet(panelWidth, sheetHeight);

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

  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={handleClose}
      // MUI would restore focus before the slide-out ends; onExited does it.
      disableRestoreFocus
      slotProps={{
        transition: { onExited: restoreFocus },
        paper: {
          role: "dialog",
          "aria-labelledby": titleId,
          sx: paperSx,
        },
      }}
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
            <Typography id={titleId} component="h2" sx={{ fontWeight: 700 }}>
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
            // Clear the home indicator under the sheet on phones.
            pb: "max(16px, env(safe-area-inset-bottom))",
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
    </Drawer>
  );
}
