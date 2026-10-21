/** @file Renders markdown text safely for AI chat messages. */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box } from "@mui/material";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <Box
      sx={{
        wordBreak: "break-word",
        "& p": { m: 0, mb: 1, "&:last-child": { mb: 0 } },
        "& strong": { fontWeight: 700 },
        "& em": { fontStyle: "italic" },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  );
}
