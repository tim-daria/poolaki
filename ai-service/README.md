# Poolaki AI Service

## Description

The Poolaki AI Service is an independent microservice responsible for AI-related workflows.

The service is built with FastAPI and is designed to keep AI capabilities decoupled from the Django backend. It will progressively support RAG orchestration, prompt management, retrieval, and LLM communication.

Currently, this service provides the foundation for future AI features and exposes a health check endpoint.

---

## AI Service Responsibility

The backend is responsible for retrieving and calculating accurate financial data from the application database.

The AI service doesn't replace backend business logic. Instead, it interprets user questions, determines the required information, and generates natural language responses based on validated data provided by the backend.

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

Current architecture:
```
jango Backend
|
| HTTP API
|
AI Service (FastAPI)
```

**Future AI Components:**

- Retrieval layer
- Context builder
- Prompt management
- LLM provider integration

For detailed architecture documentation, see: [architecture.md](../docs/ai/architecture.md)


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
```
**Note:** Additional variables will be added when external AI providers, models, and retrieval infrastructure are implemented.

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
