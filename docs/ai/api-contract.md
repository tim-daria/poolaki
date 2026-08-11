# AI Service API Contract

This document defines the communication contract between the `Django` backend and the `AI Service`, while allowing both services to evolve independently.

The contracts define:
- Request and response schemas.
- Data exchanged between services.
- Validation rules.
- Error formats.

For the high-level architecture and communication flow, see: [AI Service Architecture](architecture.md).

---
## Endpoint Summary
Summary initial supported endpoints:

| Flow | Method | Endpoint | Purpose |
|---|---|---|---|
| Django → AI | POST | `/api/v1/{org_id}/chat` | Send user questions |
| AI → Django | GET | `/api/internal/v1/organizations/{org_id}/analytics/monthly-summary` | Retrieve financial summary |
| AI → Django | GET | `/api/internal/v1/organizations/{org_id}/transactions` | Retrieve transaction data |
| AI → Django | GET | `/api/internal/v1/organizations/{org_id}/recurring-transactions` | Retrieve recurring commitments |
| AI → Django | GET | `/api/internal/v1/organizations/{org_id}/goals/progress` | Retrieve goals data |

---
## Communication Flows

The AI integration consists of three main communication flows:
- User request (`Frontend -> Django -> AI service`).
- Context retrieval (`Django <- AI Service`).
- Response generation (`AI Service -> Django -> Frontend`)

For the end-to-end sequential diagram and detailed RAG pipeline execution, see [AI Service Architecture](architecture.md) and [RAG Design](rag-design.md).

## Flow 1. User request - API Endpoints

### 1.1 Health Check

`GET /health`

Used to verify that the AI Service container is running correctly. It's used by Docker health monitoring.

### Request Schema

No request body required.

### Response Schema

```json
{
  "status": "healthy"
}

```

---
### 1.2. Chat Endpoint

`POST /api/v1/{org_id}/chat`

Sends user questions and triggers AI processing to provide the final answer to the user.


### Request Schema

```
{
  "user_id": 123,
  "question": "Why am I spending more this month?"
}
```

Fields:

| Field           | Type    | Required | Description                         |
| --------------- | ------- | -------- | ----------------------------------- |
| user_id         | integer | yes      | User identifier                     |
| question        | string  | yes      | User natural language question      |


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
`GET /api/v1/{org_id}/analytics/monthly-summary`

Provides aggregated financial information for financial analysis.

#### Request Schema

```
GET /api/v1/{org_id}/analytics/monthly-summary
    ?user_id=123
    &period=2026-01
```

#### Response Schema

```
{
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
`GET /api/v1/{org_id}/transactions`

Provides transaction details required for deeper analysis.

#### Request Schema

```
GET /api/v1/{org_id}/transactions
    ?user_id=123
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
`GET /api/v1/{org_id}/goals/progress`

Provides progress information for user financial goals.

#### Request Schema

```
GET /api/v1/{org_id}/goals/progress
    ?user_id=123
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
`GET /api/v1/{org_id}/recurring-transactions`

Provides recurring financial commitments.

#### Request Schema

```
GET /api/v1/{org_id}/recurring-transactions
    ?user_id=123
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

All financial data endpoints require:

`{org_id}` as a Path Parameter to isolate organizational scope.

`user_id` as a Query Parameter to enforce user-level authorization and auditing.

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

When the `AI Service` receives a request at `POST /api/v1/{org_id}/chat`, it classifies the user intent to determine which backend APIs to call. 

For the complete list of supported intents, refer to **[Supported AI Questions Documentation](supported-ai-questions.md)**

---
## API Versioning

All future APIs should use versioning.

_Example:_

`/api/v1/`