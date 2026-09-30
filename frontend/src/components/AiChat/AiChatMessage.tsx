/** @file One chat bubble: right-aligned/tinted for the user, left-aligned/plain for the assistant. */

import { Box, Paper, Typography } from "@mui/material";
import type { ChatMessage } from "../../lib/aiChat";

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
        elevation={isUser ? 0 : 0}
        sx={{
          maxWidth: "80%",
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: isUser ? "primary.light" : "background.paper",
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {message.content}
        </Typography>
      </Paper>
    </Box>
  );
}
