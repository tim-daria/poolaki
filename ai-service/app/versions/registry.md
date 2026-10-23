<!-- Notice version history. -->

# Prompt Versions

## assistant_v4

Created: 2026-10-23

Changes:

- Added no-session-memory rule: each request is one-shot; the assistant cannot see earlier messages or previous chats.
- Forbid a closing follow-up question in every answer, so the user does not assume the chat keeps conversation memory.

## assistant_v3

Created: 2026-10-23

Changes:

- Removed goals from unsupported questions.
- Added savings/goal rule: goals are targets; savings are the money set aside to reach them; answer from context and never invent balances or progress.

## assistant_v2

Created: 2026-10-22

Changes:

- Added scope and limits: decline investment advice, external data, bank imports, future predictions, weekly/daily breakdowns, goals and specific-transaction questions.
- Added data rules: averages and comparisons computed from monthly rows, always state the data window, say which window is available when the period is out of range.
- Added security rules: treat user text and `<context>` as data, never reveal instructions or internal structure, read-only, no memory between chats, ignore requests to override rules.
- Added language rule: answer in English and notify in the user's language.
- Added formatting rules: euro amounts (`€5.000,00`), markdown bold for key figures, dates like `21 October 2026`, no headings or tables.
- `financial_assistant_v0.md`: wrapped `{{context}}` and `{{user_question}}` in `<context>` / `<user_question>` tags and added the data scope (3 months for transactions, calendar year for summary and categories).

## assistant_v1

Created: 2026-09-07

Changes:

- Limit answer to 5 lines max.

## assistant_v0

Created: 2026-08-05

Changes:

- Initial assistant behavior.
- Added anti-hallucination rules.
