/** @file One chat bubble: right-aligned/tinted for the user, left-aligned/plain
 * for the assistant. The user's text shows verbatim; only the assistant's
 * reply is markdown. */

import { Box, Paper, Typography } from "@mui/material";
import type { ChatMessage } from "../../lib/aiChat";
import { MarkdownMessage } from "./MarkdownMessage";

// react-markdown emits "\n" text nodes between blocks, so the assistant
// branch must not use pre-wrap: block margins carry the spacing instead.
const assistantSx = {
  "& p": { m: 0, mb: 1, "&:last-child": { mb: 0 } },
  "& ul, & ol": { pl: 2.5, m: 0, mb: 1, "&:last-child": { mb: 0 } },
  "& table": {
    display: "block",
    overflowX: "auto",
    borderCollapse: "collapse",
    mb: 1,
    "&:last-child": { mb: 0 },
  },
  "& th, & td": { border: 1, borderColor: "divider", px: 1, py: 0.5 },
} as const;

export function AiChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <Paper
        variant={isUser ? "elevation" : "outlined"}
        elevation={0}
        sx={{
          maxWidth: "80%",
          minWidth: 0,
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: isUser ? "primary.light" : "background.paper",
        }}
      >
        <Typography
          component="div"
          variant="body2"
          sx={{
            overflowWrap: "anywhere",
            ...(isUser ? { whiteSpace: "pre-wrap" } : assistantSx),
          }}
        >
          {isUser ? (
            message.content
          ) : (
            <MarkdownMessage content={message.content} />
          )}
        </Typography>
      </Paper>
    </Box>
  );
}
