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
| Django → AI | POST | `/api/v1/chat` | Forward the user question to the AI Service |
| AI → Django | POST | `/api/internal/v1/analytics/summary` | Monthly income/expense for a year + current balance |
| AI → Django | POST | `/api/internal/v1/analytics/categories` | Monthly per-category breakdown for a year |
| AI → Django | POST | `/api/internal/v1/transactions` | Filtered transaction list |
| AI → Django | POST | `/api/internal/v1/categories` | Organization category list |

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
2. `Django → AI Service`: `POST /api/v1/chat` — Django forwards the question with the user and organization identifiers.

### Chat Endpoint (Django → AI Service)

`POST /api/v1/chat`

Sends user questions and triggers AI processing to provide the final answer to the user.

### Request Schema

```
{
  "user_id": 123,
  "organization_id": 456,
  "question": "Why am I spending more this month?"
}
```

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

Internal endpoints require both:

1. **Service authentication.** Header `Authorization: Bearer <token>` with the shared internal API token. The token is provisioned to the AI Service through Vault and compared by Django in constant time. Missing or invalid token → `401 UNAUTHORIZED`.
2. **User authorization.** `user_id` must be a member of `organization_id`. Otherwise → `403 FORBIDDEN`.

The token authenticates the *service*, not an end user.

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

### 2.2. Category Breakdown

`POST /api/internal/v1/analytics/categories/`

Per-category, per-month distribution for a year, covering both income and expense categories.

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

- `monthly` is always 12 slots, index `0` = January, zero-filled. `total` equals the sum of `monthly`.
- Only categories with at least one transaction in the year are returned; categories without activity are omitted.
- Ordering: income categories first, then expense categories; within a type, by `total` descending, then by name. The biggest expense category is the first expense entry.

### 2.3. Transactions

`POST /api/internal/v1/transactions/`

Filtered transaction list.

Covers: "what are my top 5 expenses?", "when was the last time I made an expense?", "what was my largest transaction in the last 3 months?", and generic "show my transactions" browsing.

#### Request Schema

| Field           | Type    | Required | Description                              |
| --------------- | ------- | -------- | ---------------------------------------- |
| user_id         | integer | yes      | User identifier used for authorization and data scoping |
| organization_id | integer | yes      | Organization identifier                  |
| entry_type      | string  | no       | `income` \| `expense`                    |
| date_from       | string  | no       | Inclusive start date, `YYYY-MM-DD`       |
| date_to         | string  | no       | Inclusive end date, `YYYY-MM-DD`         |
| sort            | string  | no       | `date_desc` (default) \| `date_asc`     |
| limit           | integer | no       | Maximum rows returned. Default `100`, max `200` |

Default date window when `date_from` / `date_to` are omitted: the last 3 calendar months including the current one (`date_from` = first day of the month two months before the current month, `date_to` = today).

The AI Service fills `date_from` / `date_to` from the fixed template (below); the dates are computed in code from the current date. The LLM returns the intent label only and does not produce filter values.

**Request Example**

The single request the AI Service sends — the full 3-month list (dates computed from the current date):

```
{
  "user_id": 123,
  "organization_id": 456,
  "date_from": "2026-04-01",
  "date_to": "2026-06-29",
  "sort": "date_desc",
  "limit": 200
}
```

**Requests by intent (closed set)**

The LLM returns the intent label only (no slots); the AI Service builds the request from a fixed template per intent. All dates are computed in code from the current date.

| Intent | Request |
|---|---|
| `transactions` ("show my transactions", "top 5 expenses", "largest transaction in the last 3 months", "when was my last expense?", sub-period variants) | `date_from` / `date_to` = last 3 calendar months, `sort: date_desc`, `limit: 200` (all entry types) |

The template retrieves the full bounded transaction list; the LLM answers from it:
- latest expense = the first `expense` row (the list is newest-first);
- top `N` / largest = filter by entry type and/or a date sub-period, then scan by amount;
- `limit: 200` truncates the oldest rows first, which is unreachable at this scale.



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
      "amount": "50.00"
    }
  ]
}
```

### 2.4. Categories

`POST /api/internal/v1/categories`

The organization's category list.

Used by the AI Service to answer category-related questions, e.g. which category fits a new transaction (VEC-003), together with the category definitions from the vector store.

#### Request Schema

| Field           | Type    | Required | Description                              |
| --------------- | ------- | -------- | ---------------------------------------- |
| user_id         | integer | yes      | User identifier used for authorization and data scoping |
| organization_id | integer | yes      | Organization identifier                  |

#### Response Schema

```
{
  "categories": [
    {"id": 4, "name": "Food", "type": "expense"},
    {"id": 12, "name": "Salary", "type": "income"}
  ]
}
```

### 2.5. Deferred Endpoints (Goals)

Goal endpoints are part of the planned contract but are **not implemented** in this iteration. The AI Service must not call them; goal questions (see [Supported AI Questions](../supported-questions.md)) are declined until the endpoints land.

Planned:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/internal/v1/goals/progress` | Goal target, current balance, progress percentage |
| POST | `/api/internal/v1/goals/forecast` | Estimated completion date at the current saving pace |

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
