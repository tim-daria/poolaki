# AI Service API Contract

This document defines the communication contract between the `django` backend and the `ai-service`, while while allowing both services to evolve independently.

he purpose of these contracts is to establish how both services will communicate before implementation begins.

The contracts define:
- Request and response schemas.
- Data exchanged between services.
- Validation rules.
- Error formats.

For the high-level architecture and communication flow, see: [AI Service Architecture](architecture.md).

---
## Endpoint Summary

| Flow | Method | Endpoint | Purpose |
|---|---|---|---|
| Django → AI | GET | /health | Service health check |
| Django → AI | POST | /api/v1/chat | Send user questions |
| Django → AI | POST | /api/v1/context | Generate AI context |
| AI → Django | GET | /api/v1/analytics/monthly-summary | Retrieve financial summary |
| AI → Django | GET | /api/v1/transactions | Retrieve transaction data |
| AI → Django | GET | /api/v1/goals/progress | Retrieve goals data |

---
## Communication Flows
The AI integration consists of three main communication flows:

**1. User Request:**
```
Django → AI Service
```

`django` sends user questions to the AI Service for AI processing.

```
Frontend
      |
      v
Django Backend
      |
      | POST /api/v1/chat
      v
AI Service
```

_Examples:_

- User chat requests.
- Context generation requests.
- AI workflow execution.

**2. Context Retrieval:**
```
AI Service → Django
```

After receiving a question, the `ai-service`determines what financial information is required and requests validated data from `django`.

The `ai-service` uses this information to build the context that will be provided to the `LLM`.

```
AI Service
      |
      | Request financial data
      |
      v
Django Backend
      |
      | Return authorized financial data
      |
      v
AI Service
```
_Example:_

User question:
>"Why am I spending more?"

Required context:

- Current spending.
- Previous period comparison.
- Category breakdown.

**3. AI Response:**

After generating the response, the `ai-service` returns the result to `django`.
```
AI Service → Django
```

After generating the response, `django` delivers the final answer to the user.

```
AI Service
    |
    | Generated response
    v
Django Backend
    |
    v
Frontend
```

---

## Flow 1. Django → AI Service Contracts

### API Endpoints

#### Health Check

#### `GET /health`

Used to verify that the AI Service is running correctly.

#### Purpose
This endpoint is used by Docker health monitoring.

#### Request

No request body required.

#### Response

```json
{
  "status": "healthy"
}

```
#### Chat Endpoint

POST /api/v1/chat

Purpose:

Receives user questions and triggers AI processing.

The AI Service is responsible for:

Intent detection.
Context generation.
Prompt construction.
LLM communication.

Request Schema

```
{
  "user_id": 123,
  "organization_id": 456,
  "question": "Why am I spending more this month?"
}
```

Fields:

| Field           | Type    | Required | Description                         |
| --------------- | ------- | -------- | ----------------------------------- |
| user_id         | integer | yes      | User identifier                     |
| organization_id | integer | yes      | Organization/shared account context |
| question        | string  | yes      | User natural language question      |


Response Schema

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
Purpose

The AI Service does not access the database directly.

When additional information is required, the AI Service requests validated financial data from Django.

These endpoints are future contracts and will be implemented by the Django Backend.

Monthly Financial Summary
GET /api/v1/analytics/monthly-summary

Purpose:

Provides aggregated financial information for financial analysis.

Request

Example:

```
GET /api/v1/analytics/monthly-summary
    ?user_id=123
    &organization_id=456
    &period=2026-01
```

Response

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

Transactions
GET /api/v1/transactions

Purpose:

Provides transaction details required for deeper analysis.

Request

Example:

```
GET /api/v1/transactions
    ?user_id=123
    &organization_id=456
```

Response
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

Goals
GET /api/v1/goals/progress

Purpose:

Provides progress information for user financial goals.

Request

Example:

```
GET /api/v1/goals/progress
    ?user_id=123
    &organization_id=456
```

Response
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
Recurring Transactions
GET /api/v1/recurring-transactions

Purpose:

Provides recurring financial commitments.

Request

Example:

```
GET /api/v1/recurring-transactions
    ?user_id=123
    &organization_id=456
```

Response
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
Data Requirements

All financial data endpoints must include:

user_id
organization_id

The organization context is required to guarantee that financial information belongs to the correct account scope.

Error Format

All API errors should follow a consistent structure.

Example:

```
{
  "error":{
    "code":"INVALID_REQUEST",
    "message":"Missing organization_id"
  }
}
```

Error codes:
| Code            | Description                          |
| --------------- | ------------------------------------ |
| INVALID_REQUEST | Invalid request payload              |
| UNAUTHORIZED    | Authentication failure               |
| FORBIDDEN       | User does not have access            |
| DATA_NOT_FOUND  | Requested information does not exist |
| CONTEXT_ERROR   | Context generation failed            |
| LLM_ERROR       | LLM provider failure                 |
| INTERNAL_ERROR  | Unexpected service failure           |

---
## API Versioning

All future APIs should use versioning.

_Example:_

`/api/v1/`