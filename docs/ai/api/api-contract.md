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
## Endpoint Summary
Summary initial supported endpoints:

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
  "user_id": 123,
  "organization_id":456,
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

Provides transaction details required for deeper analysis.

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
  "transactions":[
    {
      "category":"Food",
      "amount":50,
      "date":"2026-01-10"
    }
  ]
}
```

### 2.3. Goals
`POST /api/internal/v1/goals/`

Provides progress information for user financial goals.

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
  "goals":[
    {
      "name":"Emergency Fund",
      "target":5000,
      "current":3200,
      "progress":64
    }
  ]
}
```
### 2.4. Recurring Transactions
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

---
## Data Requirements

Internal endpoints use `POST` with `user_id` and `organization_id` in the request **body**. This keeps the service-to-service API consistent and allows additional context parameters to be added without changing endpoint paths.

`organization_id` isolates organizational scope.

`user_id` enforces user-level authorization and auditing.

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