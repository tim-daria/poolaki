# Poolaki AI Service

## Description

The Poolaki AI Service is an independent microservice responsible for AI-related workflows.

The service is built with FastAPI and is designed to keep AI capabilities decoupled from the Django backend. It will progressively support RAG orchestration, prompt management, retrieval, and LLM communication.

Currently, this service provides RAG orchestration + intent classification + LLM integration (openRouter) and exposes a health check endpoint.

---

## AI Service Responsibility

The backend is responsible for retrieving financial data from the application database.

The AI service doesn't replace backend business logic. Instead, it interprets user intention and questions, determines the required information, and generates natural language responses based on validated data provided by the backend.

Example:

Backend response:

```
{
  "category": "Food",
  "amount": 850
}
```

AI response:

```
"You spent €850 this month, mainly on Food."
```

## Architecture

The AI Service runs as an independent Docker container and communicates with the Django backend through HTTP APIs.

**note:_** `Django` integration currently uses a temporary mock client for local development and end-to-end testing. It will be replaced by the internal Django API integration.

Current architecture:

```text
                         User Question
                              |
                              v
                    +-------------------+
                    |     AI Service    |
                    |      FastAPI      |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    | Intention Service |
                    | Intent Detection  |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    |     Retriever     |
                    | Hybrid Retrieval  |
                    +-------------------+
                       /             \
                      v               v
             +---------------+   +---------------+
             |   Django API  |   |   Vector DB   |
             | Structured    |   | Unstructured  |
             | Financial Data|   | Context       |
             +---------------+   +---------------+
                      \               /
                       v             v
                    +-------------------+
                    |  Context Builder  |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    |   Prompt Builder  |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    |     LLM Client    |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    |  External LLM     |
                    |     Provider      |
                    +-------------------+
                              |
                              v
                         AI Response
```

**Components**

- Intention Service: classifies the user's question into a supported financial intent.
- Retriever: orchestrates retrieval of structured and unstructured context based on the detected intent.
- Context Builder: combines and limits the retrieved context before sending it to the LLM.
- Prompt Builder: loads the prompt templates and injects the user question and retrieved context.
- LLM Client: communicates with the external LLM provider, implements retries and fallback between configured models, handles transient and non-retryable HTTP errors, and logs request timing and failures.
- Logging: application-wide structured JSON logging for LLM requests, including model, attempt number, HTTP status, and response duration.

**Future AI Components:**

- Vector database integration (`pgvector`)
- Embedding generation and indexing

For detailed architecture documentation, see: [architecture.md](../docs/ai/architecture.md)

### LLM Resilience and Error Handling

The LLM Client implements retry and fallback mechanisms for transient failures.

- Retryable errors: HTTP 429, 502, 503, and request timeouts.
- Non-retryable errors: HTTP 400, 401, and 403.
- Retryable errors are retried according to `LLM_MAX_RETRIES`.
- If all attempts with the primary model fail, the configured fallback model is attempted.
- If all attempts fail, the service raises `LLMClientError` and the chat endpoint returns HTTP 503.

LLM request timing, model, attempt number, and HTTP status codes are logged for observability and future performance analysis.

---

## Tech Stack

- Python 3.12
- FastAPI
- Uvicorn
- Pydantic Settings
- HTTPX
- Docker

---

## Project Structure

```
ai-service/

├── app/
│
├── Dockerfile
├── pyproject.toml
├── CHANGELOG.md
└── README.md
```

---

## Requirements

The following tools are required:

- Docker
- Docker Compose
- LLM provider external API key

Optional development environment:

- Docker Sandbox (`sbx`) if running the project inside a sandbox environment.

---

## Environment Variables

Create a local `.env` file:

```
ai-service/
└── .env
```

Example:

```env
AI_SERVICE_ENV=development
AI_SERVICE_PORT=8000

LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=<your-openrouter-api-key>
LLM_MODEL=<your-model>
```

**Note:** include LLM provider configuration.

## Instructions

1. **Build the service.** From the project root:

```bash
docker compose build ai-service
```

2. **Run the service**.

```bash
docker compose up ai-service
```

The service will run inside the Docker network and will be accessible internally through:

```
http://ai-service:8000
```

## Health Check

The service exposes a health check endpoint used by Docker health monitoring. Endpoint: `GET /health`

#### Response

```json
{
  "status": "healthy"
}
```

## Test chat endpoint

```
docker compose exec caddy wget -qO- \
  --header="Content-Type: application/json" \
  --post-data='{"user_id":123,"organization_id":456,"question":"How much did I spend this month?"}' \
  http://ai-service:8000/api/v1/chat
```

### Expected response:

```
{
  "answer": "...",
  "metadata": {
    "intent": "monthly_summary"
  }
}
```

**Note**: The chat endpoint currently supports intent classification, retrieval, context construction, prompt generation, and LLM response generation.

## API Documentation

FastAPI automatically generates interactive API documentation.

Swagger UI:

```
/docs
```

ReDoc:

```
/redoc
```

For service contracts and communication details, see: [api-contract.md](docs/ai/api-contract.md)

## Development Guidelines

- AI logic remains inside the AI Service.
- Django owns business rules and user data.
- Communication happens through API contracts.

For detailed decisions, see: [decisions.md](docs/ai/decisions.md)

## Documentation

- Architecture: `docs/architecture.md`

- API Contract: `docs/api-contract.md`

- Decisions: `docs/decisions.md`

## Versioning

The AI Service follows semantic versioning.

Current version:

```
0.1.0
```

Changes are documented in: [CHANGELOG.md](CHANGELOG.md)

## Resources

https://fastapi.tiangolo.com/
https://docs.docker.com/ai/sandboxes/
RAG tutorial: https://youtu.be/swvzKSOEluc?si=TQ8qIycFKaRhsjMy
Hybrid RAG referent: https://github.com/davidvonthenen/2026-wearedevelopers-eu-hybridrag/tree/main
https://openrouter.ai/models
