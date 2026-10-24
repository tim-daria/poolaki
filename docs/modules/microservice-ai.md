# AI Microservice Architecture

## Overview

Poolaki uses an independent FastAPI microservice for AI assistant functionality, following a loosely coupled, single-responsibility architecture.

## Service Responsibilities

- **Django Backend:** Manages authentication, authorization, financial data, business logic, and REST APIs. See the [Backend README](../../backend/README.md) for details.

- **AI Service:** Handles intent classification, retrieval orchestration, context building, prompt construction, and LLM integration. See the [AI Service README](../../ai-service/README.md) for implementation details.

- **PostgreSQL + pgvector:** Stores shared product knowledge and supports vector similarity search. See [RAG Design](../ai/rag-design.md) for retrieval and embedding details.

## Communication

The frontend communicates with Django, which calls the AI Service through HTTP APIs. The AI Service retrieves authorized financial data through Django REST APIs and performs vector searches against its dedicated knowledge schema. See the [AI API Contract](../ai/api/api-contract.md) for endpoint details.

## Separation of Concerns

Each service has clear responsibilities and interfaces. The AI Service manages AI workflows and global knowledge retrieval without directly accessing financial application tables. This allows both services to evolve independently. See [Architecture Decisions](../ai/decisions.md) for the rationale behind these boundaries.
