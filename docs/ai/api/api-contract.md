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
| Django → AI | POST | `/api/v1/chat` | Send user questions |
| AI → Django | POST | `/api/internal/v1/analytics/monthly-summary` | Retrieve financial summary |
| AI → Django | POST | `/api/internal/v1/transactions` | Retrieve transaction data |
| AI → Django | POST | `/api/internal/v1/goals/progress` | Retrieve goals data |

The `/api/internal/` namespace is reserved for service-to-service communication and is not part of the public `Frontend` API.

For more backend definitions see the [backend README](../../../backend/README.md) and specifics on `docs/backend`.

---

## Communication Flows

The AI integration consists of three main communication flows:
- User request (`Frontend -> Django -> AI Service`).
- Context retrieval (`AI Service -> Django`).
- Response generation (`AI Service -> Django -> Frontend`)

For the end-to-end sequential diagram and detailed RAG pipeline execution, see [AI Service Architecture](architecture.md) and [RAG Design](rag-design.md).

## Flow 1. User request - API Endpoints

### Chat Endpoint

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
These are endpoints used by the `AI Service` to retrieve information from `Django`.

### 2.1. Financial Summary

`POST /api/internal/v1/analytics/summary`

Monthly income/expense distribution for a year plus the current organization balance.

Covers: "how much did I spend / earn this (last) month?", "am I spending more or less than last month?", "what is my current balance?", "what is my average monthly income?" (the AI Service derives the average from the month rows).


### Authentication

Internal endpoints require:

1. **Service authentication.** Header `Authorization: Bearer <token>` with the shared internal API token. The token is provisioned to the AI Service through Vault and compared by Django in constant time. Missing or invalid token → `401 UNAUTHORIZED`.

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
  "period": "2026-01"
}
```

#### Response Schema

```
{
  "period":"2026-01",
  "total_income":2500,
  "total_expenses":850,
  "categories":[
    {
      "name":"Food",
      "amount":300
    }
  ]
}
```

### 2.2. Transactions
`POST /api/internal/v1/transactions`

Provides transaction details required for deeper analysis. The request supports optional filters and sorting parameters depending on the user's intent.

#### Request Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | integer | yes | User identifier used for authorization and data scoping |
| `organization_id` | integer | yes | Organization identifier used to isolate organizational scope |
| `category` | string | no | Filter transactions by category |
| `range` | string | no | Time range for the requested transactions |
| `sort` | string | no | Sorting order for the returned transactions |
| `limit` | integer | no | Maximum number of transactions to return |


**Supported Use Cases**

| Use Case | Request Parameters | Purpose |
|---|---|---|
| Transaction list | — | Retrieve transactions |
| Category filtering | `category` | Retrieve transactions for a specific category |
| Top expenses | `sort`, `limit` | Retrieve the highest-value transactions |
| Largest transaction | `range`, `sort` | Retrieve the highest-value transaction within a period |
| Latest transaction | — | Retrieve the most recent expense transaction |

_Request Examples:_

Transactions by category

{
  "user_id": 123,
  "organization_id": 456,
  "category": "Food"
}

Top expenses

{
  "user_id": 123,
  "organization_id": 456,
  "sort": "amount_desc",
  "limit": 5
}

Largest transaction in a period

{
  "user_id": 123,
  "organization_id": 456,
  "range": "3months",
  "sort": "amount_desc",
  "limit": 1
}

#### Response Schema
The response uses the same transaction collection structure for filtered and unfiltered requests. The returned transactions reflect the filters and sorting specified in the request.

```
{
  "transactions":[
    {
      "category":"Food",
      "amount":50,
      "date":"2026-01-10"
    }
  ]
}
```

For intents that require an aggregate value rather than individual transactions, such as "How much did I spend on Food?", the corresponding analytics endpoint should be used instead of `transactions`.

### 2.3. Category Spending
`POST /api/internal/v1/analytics/categories`

Provides spending information for a specific category.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456,
  "category": "Food"
}
```

#### Response Schema
```
{
  "category": "Food",
  "amount": 230,
  "period": "2026-01"
}
```

### 2.4. Category Ranking

`POST /api/internal/v1/analytics/categories/ranking`

Provides expense categories ranked by spending.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Response Schema
```
{
  "categories": [
    {
      "name": "Food",
      "amount": 230
    }
  ]
}
```

### 2.5. Latest Transaction

`POST /api/internal/v1/transactions/latest`

Provides the user's most recent expense transaction.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Response Schema
```
{
  "transaction": {
    "category": "Entertainment",
    "amount": 15,
    "date": "2026-06-15"
  }
}
```

### 2.6. Income Summary
`POST /api/internal/v1/analytics/income-summary`

Provides aggregated income information for a period.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456,
  "period": "2026-01"
}
```

#### Response Schema
```
{
  "organization_id": 456,
  "period": "2026-01",
  "total_income": 2200
}
```

### 2.7. Average Income
`POST /api/internal/v1/analytics/income-average`

Provides the user's average monthly income.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Response Schema
```
{
  "average_monthly_income": 2100
}
```

### 2.8. Current Balance
`POST /api/internal/v1/analytics/balance`

Provides the user's current financial balance.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Response Schema
```
{
  "balance": 3500
}
```

### 2.9. Goal Progress
`POST /api/internal/v1/goals/progress`

Provides progress information for a specific financial goal.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456,
  "goal_id": 789
}
```

#### Response Schema
```
 {
  "goal_id": 789,
  "target": 5000,
  "current": 3000,
  "progress": 60
}
```

### 2.10. Goal Forecast
`POST /api/internal/v1/goals/forecast`

Provides an estimated completion date for a financial goal.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456,
  "goal_id": 789
}
```
#### Response Schema
```
{
  "goal_id": 789,
  "estimated_completion": "2026-10"
}
```

### 2.11. Spending Trends

`POST /api/internal/v1/analytics/trends`

Provides spending trends compared with previous periods.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Response Schema
```
{
  "comparison_period": "previous_month",
  "change_percentage": 15,
  "direction": "increase"
}
```

### 2.12. Cash Flow

`POST /api/internal/v1/analytics/cash-flow`

Provides net cash flow for the requested period.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456,
  "period": "current_week"
}
```

#### Response Schema
```
{
  "period": "current_week",
  "net_cash_flow": 350
}
```

### 2.13. Shared Expenses

`POST /api/internal/v1/analytics/shared-expenses`

Provides aggregated expenses for shared accounts.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Response Schema
```
{
  "period": "current_month",
  "total_shared_expenses": 1200
}
```

### 2.14. Organization Summary

`POST /api/internal/v1/analytics/organization-summary`

Provides aggregated spending information for the organization.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Response Schema
```
{
  "organization_id": 456,
  "period": "current_month",
  "total_expenses": 2500
}
```

### 2.15. Categories

`POST /api/internal/v1/categories`

Provides category information required for transaction categorization.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456
}
```

#### Response Schema
```
{
  "categories": [
    {
      "name": "Food",
      "description": "Groceries, restaurants, and food delivery"
    }
  ]
}
```

### 2.16. Transaction Detail

`POST /api/internal/v1/transactions/detail`

Provides detailed information for a specific transaction.

#### Request Schema
```
{
  "user_id": 123,
  "organization_id": 456,
  "transaction_id": 789
}
```

#### Response Schema
```
{
  "transaction": {
    "id": 789,
    "description": "Public transport",
    "category": "Transport",
    "amount": 50,
    "date": "2026-01-10"
  }
}
```

---
## Data Requirements

Internal endpoints use `POST` with `user_id` and `organization_id` in the request **body**. This keeps the service-to-service API consistent and allows additional context parameters to be added without changing endpoint paths.

`organization_id` isolates organizational scope.

`user_id` enforces user-level authorization and auditing.

Additional request body fields are endpoint-specific and defined in each endpoint's Request Schema.

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
| UNAUTHORIZED    | 401 Unauthorized          | Authentication failure               |
| FORBIDDEN       | 403 Forbidden             | User does not have access            |
| DATA_NOT_FOUND  | 404 Not Found             | Requested information does not exist |
| CONTEXT_ERROR   | 422 Unprocessable Entity  | Context generation failed            |
| LLM_ERROR       | 502 Bad Gateway           | LLM provider failure                 |
| INTERNAL_ERROR  | 500 Internal Server Error | Unexpected service failure           |

---
## Mapping Intents to Endpoints

When the `AI Service` receives a request at `POST /api/v1/chat`, it classifies the user intent to determine which backend APIs to call.

For the complete list of supported intents, refer to **[Supported AI Questions Documentation](../supported-questions.md)**

---
## API Versioning

All future APIs should use versioning.

_Example:_

`/api/v1/`
