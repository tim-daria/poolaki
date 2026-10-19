# AI Service API Contract

This document defines the communication contract between the `Django` backend and the `AI Service`, while allowing both services to evolve independently.

The contracts define:
- Request and response schemas.
- Data exchanged between services.
- Validation rules.
- Error formats.
- API versioning and endpoint namespaces.

For the high-level architecture and communication flow, see: [AI Service Architecture](architecture.md).

---
## High-Level Endpoint Summary

Initial supported endpoints:

| Flow | Method | Endpoint | Purpose |
|---|---|---|---|
| Frontend → Django | POST | `/api/v1/organizations/{org_id}/chat/` | Public chat endpoint (session auth) |
| Django → AI | POST | `/api/v1/chat/` | Forward the user question to the AI Service |
| AI → Django | POST | `/api/internal/v1/analytics/summary/` | Monthly income/expense for a year + current balance |
| AI → Django | POST | `/api/internal/v1/transactions/` | Static transaction context: income/expense of the last 3 calendar months |
| AI → Django | POST | `/api/internal/v1/categories/` | Organization income/expense categories, each with a monthly breakdown for a year |

The internal endpoints are intentionally few: each returns a self-contained data set that covers a family of intents, so the AI Service can answer most questions with a single call.

The `/api/internal/` namespace is reserved for service-to-service communication. It is not routed at the edge (Caddy exposes only `/api/v1/*`) and is reachable only from the backend Docker network.

For more backend definitions see the [backend README](../../../backend/README.md) and specifics on `docs/backend`.

---
## Communication Flows

The AI integration consists of three main communication flows:
- User request (`Frontend -> Django -> AI Service`).
- Context retrieval (`AI Service -> Django`).
- Response generation (`AI Service -> Django -> Frontend`)

For the end-to-end sequential diagram and detailed RAG pipeline execution, see [AI Service Architecture](architecture.md) and [RAG Design](rag-design.md).

## Flow 1. User request - API Endpoints

The user request passes two hops:

1. `Frontend → Django`: `POST /api/v1/organizations/{org_id}/chat/` — public endpoint. Standard session authentication and organization membership apply, as for the rest of the `/api/v1/` API; the user comes from the session and the organization from the URL.
2. `Django → AI Service`: `POST /api/v1/chat/` — Django forwards the question with the user and organization identifiers.

### Chat Endpoint (Django → AI Service)

`POST /api/v1/chat/`

Sends user questions and triggers AI processing to provide the final answer to the user.

### Request Schema

Fields:

| Field           | Type    | Required | Description                              |
| --------------- | ------- | -------- | ---------------------------------------- |
| user_id         | integer | yes      | User identifier                          |
| organization_id | integer | yes      | Organization associated with the request |
| question        | string  | yes      | User natural language question           |


### Response Schema

```
{
  "answer": "Your expenses increased mainly because of Food spending.",
  "metadata": {
    "intent": "monthly_summary"
  }
}
```

---
## Flow 2: AI Service → Django

These are the endpoints the `AI Service` uses to retrieve financial data from `Django`.

### Authentication

Internal endpoints require:

1. **User authorization.** `user_id` must be a member of `organization_id`. Otherwise → `403 FORBIDDEN`.


### 2.1. Financial Summary

`POST /api/internal/v1/analytics/summary/`

Monthly income/expense distribution for a year plus the current organization balance.

Covers: "how much did I spend / earn this (last) month?", "am I spending more or less than last month?", "what is my current balance?", "what is my average monthly income?" (the AI Service derives the average from the month rows).

#### Request Schema

| Field           | Type    | Required | Description                              |
| --------------- | ------- | -------- | ---------------------------------------- |
| user_id         | integer | yes      | User identifier used for authorization and data scoping |
| organization_id | integer | yes      | Organization identifier                  |
| year            | integer | no       | Year to report on, 4-digit. Default: current year |

#### Response Schema

```
{
  "year": 2026,
  "balance": "3500.00",
  "totals": {
    "income": "25000.00",
    "expense": "8500.00"
  },
  "months": [
    {"month": 1, "income": "2500.00", "expense": "850.00"},
    {"month": 2, "income": "2200.00", "expense": "720.00"},
    {"month": 3, "income": "0.00", "expense": "0.00"}
  ]
}
```

- `months` always contains all 12 entries, `month` is `1` (January) … `12` (December). Months without transactions are zero-filled, so period comparisons never depend on missing rows.
- `totals` is the sum over the reported year.
- `balance` is the organization balance **as of today, over the full transaction history** — it is not limited by `year`.

### 2.2. Categories

`POST /api/internal/v1/categories/`

The organization's income and expense category list, each category carrying its per-month distribution for a year.

Covers: category spending questions ("how much did I spend on food?", "what is my biggest expense category?") and category reference questions ("which categories do I have?", "which category fits this transaction?"), so the whole category intent family is answered by a single call.

#### Request Schema

| Field           | Type    | Required | Description                              |
| --------------- | ------- | -------- | ---------------------------------------- |
| user_id         | integer | yes      | User identifier used for authorization and data scoping |
| organization_id | integer | yes      | Organization identifier                  |
| year            | integer | no       | Year the per-category breakdown covers, 4-digit. Default: current year |

#### Response Schema

```
{
  "year": 2026,
  "categories": [
    {
      "category_id": 12,
      "name": "Salary",
      "type": "income",
      "total": "25200.00",
      "monthly": ["2200.00", "2200.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"]
    },
    {
      "category_id": 4,
      "name": "Food",
      "type": "expense",
      "total": "2300.00",
      "monthly": ["180.00", "190.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00"]
    }
  ]
}
```

- One row per income and expense category in the organization, including categories without activity in the year (zero-filled), so the AI Service can distinguish "no spending on Health this year" from "the category does not exist".
- `monthly` is always 12 slots, index `0` = January, zero-filled. `total` equals the sum of `monthly`.
- Only income and expense categories are returned. The contribution category is excluded until the planned `withdraw` entry type lands: savings only make sense net of withdrawals, so contribution data is deferred with the goal endpoints (2.4).
- Ordering: income categories first, then expense categories; within a type, by `total` descending, then by name. The biggest expense category is the first expense entry.

### 2.3. Transactions

`POST /api/internal/v1/transactions/`

Static transaction context: all income/expense transactions of the last 3 calendar months (inclusive), newest first. The AI Service sends no filters — the LLM returns the intent label only, and Django decides the payload (window, ordering, entry types).

Covers: "what are my top 5 expenses?", "when was the last time I made an expense?", "what was my largest transaction in the last 3 months?", and generic "show my transactions" browsing.

#### Request Schema

| Field           | Type    | Required | Description                              |
| --------------- | ------- | -------- | ---------------------------------------- |
| user_id         | integer | yes      | User identifier used for authorization and data scoping |
| organization_id | integer | yes      | Organization identifier                  |

The body contains only `user_id` and `organization_id`. Unknown fields are ignored.

**Request Example**

The single request the AI Service sends for every transaction intent:

```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Window, ordering, and row set

- Window: the last 3 calendar months including the current one — from the first day of the month two months before the current month to today. Computed server-side from the current date; the AI Service sends no dates.
- No row cap: every income/expense transaction in the window is returned.
- Newest first: `date` descending, `id` descending within a day.
- Only `income` and `expense` are returned. `contribution` / `withdraw` are internal goal transfers, not income/expense events, and are excluded; goal funding questions are answered by the goals endpoint (2.4).

The endpoint retrieves the full bounded list; the LLM answers from it:
- latest expense = the first `expense` row (the list is newest-first);
- top `N` / largest = filter by entry type and/or a date sub-period, then scan by amount.

Questions about periods **outside** the fetched window (e.g. "largest expense last year") are still classified into the same intent. The final-answer prompt receives the original question together with the data window actually retrieved and must state that window or decline politely.

#### Response Schema

```
{
  "transactions": [
    {
      "id": 789,
      "date": "2026-06-20",
      "description": "Groceries",
      "entry_type": "expense",
      "category": "Food",
      "goal": null,
      "amount": "50.00"
    }
  ]
}
```

- `date` is `YYYY-MM-DD`; `amount` is a 2-decimal string.
- `category` and `description` are `null` when the transaction has none.
- `goal` is the name of the linked goal (e.g. an expense paid from a goal), `null` when the transaction is not tied to a goal.

### 2.4. Deferred Endpoints (Goals)

Goal endpoints are part of the planned contract but are **not implemented** in this iteration. The AI Service must not call them; goal questions (see [Supported AI Questions](../supported-questions.md)) are declined until the endpoints land.

Planned:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/internal/v1/goals/progress/` | Goal target, current balance, progress percentage |
| POST | `/api/internal/v1/goals/forecast/` | Estimated completion date at the current saving pace |

---
## Data Requirements

Internal endpoints use `POST` with `user_id` and `organization_id` in the request **body**. This keeps the service-to-service API consistent and allows additional context parameters to be added without changing endpoint paths.

`organization_id` isolates organizational scope.

`user_id` enforces user-level authorization and auditing (validated against organization membership).

Additional request body fields are endpoint-specific and defined in each endpoint's Request Schema.

---
## Error Format

All API errors should follow a consistent structure.

```
{
  "error":{
    "code":"INVALID_REQUEST",
    "message":"Missing parameters"
  }
}
```

Error codes:
| Code            | HTTP Status               | Description                          |
| --------------- | ------------------------- | ------------------------------------ |
| INVALID_REQUEST | 400 Bad Request           | Invalid request payload              |
| UNAUTHORIZED    | 401 Unauthorized          | Missing or invalid internal token    |
| FORBIDDEN       | 403 Forbidden             | User is not a member of the organization |
| DATA_NOT_FOUND  | 404 Not Found             | Requested information does not exist |
| CONTEXT_ERROR   | 422 Unprocessable Entity  | Context generation failed            |
| LLM_ERROR       | 502 Bad Gateway           | LLM provider failure                 |
| INTERNAL_ERROR  | 500 Internal Server Error | Unexpected service failure           |

---
## Mapping Intents to Endpoints

When the `AI Service` receives a request at the chat endpoint, it classifies the user intent to determine which backend APIs to call.

For the complete list of supported intents and their endpoint mapping, refer to **[Supported AI Questions Documentation](../supported-questions.md)**.


---
## API Versioning

All future APIs should use versioning.

_Example:_

`/api/v1/`
