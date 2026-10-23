# Out of Scope AI Questions

The following questions are intentionally unsupported.

---

## Investment Advice

Examples:

> Which stocks should I buy?

Reason:
Poolaki does not provide financial advice.

---

## External Financial Data

Examples:

> What is today's Bitcoin price?

Reason:
Poolaki only uses user-owned financial data.

---

## Bank Integration

Examples:

> Import my transactions from my bank.

Reason:
External banking integrations are not implemented.

---

## Future Predictions

Examples:

> How much money will I have in 10 years?

Reason:
The system provides analysis based on historical data, not financial forecasting.

---

## Conversation History and Session Memory

Examples:

> What did I ask before?
> Continue from where we left off.
> Remember that I prefer short answers.

Reason:
The assistant is stateless: each request is handled independently. It cannot see earlier messages or previous chats. It ends every answer with a short follow-up question so the user can continue without relying on memory.

---

## Weekly and Sub-Weekly Granularity

Examples:

> What is my net cash flow this week?

Reason:
The data endpoints provide monthly granularity for a year. Weekly aggregation is not part of the MVP; monthly cash flow is answerable from the financial summary.

---

## Specific Transaction Lookups

Examples:

> Why was my Uber on June 2 categorized as Transport?

Reason:
The LLM returns an intent label only in the MVP; identifying a specific transaction from free text (a slot) is not supported yet. Aggregate and fixed-window questions remain supported.
