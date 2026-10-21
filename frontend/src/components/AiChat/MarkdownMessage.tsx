/** @file Assistant reply as markdown. The prompt asks the model for bold,
 * bullets and plain paragraphs only; this keeps the bubble intact when it
 * slips: headings become bold paragraphs, links open in a new tab so the
 * conversation (React state) survives a click, code blocks and rules are
 * unwrapped to their text, and tables scroll inside the bubble (styled by
 * AiChatMessage). */

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@mui/material";
import type { ReactNode } from "react";

function BoldParagraph({ children }: { children?: ReactNode }) {
  return (
    <p>
      <strong>{children}</strong>
    </p>
  );
}

const components: Components = {
  h1: BoldParagraph,
  h2: BoldParagraph,
  h3: BoldParagraph,
  h4: BoldParagraph,
  h5: BoldParagraph,
  h6: BoldParagraph,
  a: ({ href, children }) => (
    <Link href={href} target="_blank" rel="noreferrer">
      {children}
    </Link>
  ),
};

const disallowedElements = ["pre", "hr"];

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
      disallowedElements={disallowedElements}
      unwrapDisallowed
    >
      {content}
    </ReactMarkdown>
  );
}
