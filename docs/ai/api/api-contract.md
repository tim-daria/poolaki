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
| AI → Django | POST | `/api/internal/v1/recurring-transactions` | Retrieve recurring commitments |
| AI → Django | POST | `/api/internal/v1/goals/progress` | Retrieve goals data |

The `/api/internal/` namespace is reserved for service-to-service communication and is not part of the public `Frontend` API.

For more backend definitions see the [backend README](backend/README.md) and specifics on `docs/backend`.

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
    "intent": "spending_analysis"
  }
}
```

---
## Flow 2: AI Service → Django
These are endpoints used by the `AI Service` to retrieve information from `Django`.

### 2.1. Monthly Financial Summary
`POST /api/internal/v1/analytics/monthly-summary`

Provides aggregated financial information for financial analysis.

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

### 2.3. Recurring Transactions
`POST /api/internal/v1/recurring-transactions`

Provides recurring financial commitments.

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
  "recurring_transactions":[
    {
      "name":"Rent",
      "amount":900,
      "frequency":"monthly"
    }
  ]
}
```
### 2.4. Category Spending
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

### 2.5. Category Ranking

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

### 2.6. Latest Transaction

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

### 2.7. Income Summary
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

### 2.8. Average Income
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

### 2.9. Current Balance
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

### 2.10. Goal Progress
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

### 2.11. Goal Forecast
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

### 2.12. Recurring Transactions Summary

`POST /api/internal/v1/analytics/recurring-summary`

Provides the total monthly cost of recurring transactions.

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
  "monthly_recurring_total": 250
}
```

### 2.13. Recurring Transactions Forecast

`POST /api/internal/v1/analytics/forecast-recurring`

Provides an estimate of recurring expenses for the next month.

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
  "period": "2026-02",
  "forecast_expenses": 300
}
```

### 2.14. Spending Trends

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

### 2.15. Cash Flow

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

### 2.16. Shared Expenses

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

### 2.17. Organization Summary

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

### 2.18. Categories

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

### 2.19. Transaction Detail

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

For the complete list of supported intents, refer to **[Supported AI Questions Documentation](supported-ai-questions.md)**

---
## API Versioning

All future APIs should use versioning.

_Example:_

`/api/v1/`