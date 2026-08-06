# AI Service Architecture

## Overview

The Poolaki AI Service is an independent FastAPI microservice responsible for AI-specific workflows.

The service is decoupled from the Django backend, allowing AI capabilities to evolve independently while keeping business logic and financial data ownership in Django.

---

## High-Level Architecture

Current architecture:
```
             +----------------+
             |    Frontend    |
             +----------------+
                     |
                     |
             +----------------+
             |     Django     |
             |    Backend     |
             +----------------+
                     |
                     | HTTP API
                     |
             +----------------+
             |   AI Service   |
             |    FastAPI     |
             +----------------+
                     |
                     |
          Future AI Components
          - Retrieval Layer
          - Context Builder
          - Prompt Management
          - LLM Client
```


---

## Service Responsibilities

### Django Backend

Responsible for:

- User authentication and authorization.
- Financial data ownership.
- Business rules.
- Data access permissions.
- Providing required context to AI workflows.

### AI Service

Responsible for:

- AI workflow orchestration.
- Prompt management.
- Context preparation.
- Retrieval orchestration.
- LLM provider communication.

The AI Service does not directly access the application database.

---

## Communication Flow

Current flow:

```
User
|
v
Frontend
|
v
Django Backend
|
| HTTP Request
v
AI Service
```


The AI Service receives validated information from Django and processes AI-related operations.

---

## Future RAG Architecture

```
             +----------------+
             |   AI Service   |
             |    FastAPI     |
             +----------------+
                     |
                     |
          Future AI Components
          - Retrieval Layer
          - Context Builder
          - Prompt Management
          - LLM Client
```

Planned capabilities:

- RAG orchestration pipeline
- Retrieval layer
- Context builder
- Prompt management system
- Embedding generation
- Vector database integration (pgvector)
- NVIDIA LLM integration
- AI observability and metrics


## Internal Structure
```
├── app/
│ ├── api/			# API routes and endpoints
│ ├── clients/		# External service clients (Django, LLM providers)
│ ├── config/		# Application configuration
│ ├── models/		# Internal data models and API schemas
│ ├── prompts/		# AI prompt templates
│ ├── services/		# logic and AI workflows
│ └── main.py		# FastAPI application entry point
```

---

## Infrastructure

The AI Service runs as a Docker container managed through Docker Compose.

Current infrastructure:

- FastAPI application container.
- Internal Docker network communication.
- Health check endpoint for container monitoring.

Future infrastructure:

- Vector database integration (pgvector).
- Embedding generation.
- LLM provider integration.
- AI metrics and observability.

---
##  Authentication
All internal AI requests require:
- Service authentication
- User authorization validation

### Authentication Between Backend and AI Service
The AI service does not authenticate users directly.

The main backend:
- validates JWT tokens
- verifies organization permissions
- sends only authorized context

### Error Handling

`404`: Data not found

`403`: Unauthorized access

`500`: AI service unavailable
