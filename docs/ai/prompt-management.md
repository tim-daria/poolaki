## Supported Variables

- `{{user_question}}`: The user's original question.
- `{{context}}`: Information retrieved from the RAG pipeline. If no relevant context is retrieved, a fallback message should be passed instead.

## Safety Rules

The assistant must:
- Use only the provided context delimited within `<context>` tags.
- Avoid fabricating financial information, transactions, or calculations.
- Politely decline to answer if the provided context is insufficient.