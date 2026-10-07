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
             +----------------+
             |  RAG Pipeline  |
             +----------------+
```

---

## Service Responsibilities

### Django Backend

Responsible for:

- User authentication and authorization.
- Financial data ownership.
- Business rules.
- Data access permissions.
- Exposing endpoints to return validated financial data to the AI Service.

### AI Service

Responsible for:

- AI workflow orchestration.
- Prompt management.
- Context preparation.
- Retrieval orchestration.
- LLM provider communication.

The AI Service does not directly access the application database.

---

## Data Access and Security

### Financial Data

Django remains responsible for financial data ownership, authentication, authorization, and business logic.

The AI Service retrieves user-specific financial data exclusively through authorized Django API endpoints. It must not directly access financial tables in the application database.

### Global Knowledge Base

The AI Service will access a dedicated global knowledge store for semantic retrieval of shared product FAQs and guides.

The global knowledge base will contain general product information and will not store user-specific financial data.

Global knowledge documents are shared across all users and organizations and do not require organization-specific filtering.

### Data Isolation

Financial data retrieved through `Django` must remain scoped to the authenticated user and organization.

The global knowledge store and financial application data have separate responsibilities and access boundaries.

---

## End-to-End Communication Flow

```
Frontend
    |
    | user message
    ↓
Backend (/chat endpoint)
    |
    | authentication + user/org permission validation
    ↓
AI Service
    |
    | understands the request and decides what data is needed(detects intent)
    ↓
Backend APIs
    |
    | returns validated financial data
    ↓
AI Service
    |
    | generates the natural language response
    ↓
Backend
    | final response delivery
    ↓
Frontend
```

The `ai service` receives validated information from `Django` and processes AI-related operations.

---

## RAG Architecture

For detailed information regarding the Retrieval-Augmented Generation pipeline (including `Retriever`, `ContextBuilder`, `PromptBuilder`, and hybrid vector retrieval), please refer to [RAG design documentation](docs/ai/rag-design.md).

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
- LLM provider integration.
- Vector database integration (`pgvector`).
- Embedding generation.
- AI metrics and observability.

---

## Authentication

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
