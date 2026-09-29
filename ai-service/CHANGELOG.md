# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added PostgreSQL `pgvector` integration for global knowledge documents.
- Added embedding generation through an external embedding API.
- Added a document ingestion pipeline for `Markdown` knowledge documents.
- Added document chunking and embedding persistence.
- Added semantic retrieval for global knowledge documents.
- Integrated vector retrieval with the existing hybrid RAG pipeline.

### Changed

- Updated the Retriever to combine `Django` financial data with global semantic context.
- Updated AI Service architecture and RAG documentation.

### Security

- Added dedicated database credentials for global knowledge document access.
- Restricted direct vector database access to global knowledge documents.

## [0.3.0] = 2026-09-07

### Added

- Added LLM integration through OpenRouter.
- Added intent classification for financial questions.
- Added hybrid retrieval orchestration.
- Connected context and prompt builders.
- Added LLM-generated responses through the chat endpoint.
- Added detected intent to the chat response metadata.
- Added OpenRouter configuration through environment variables.

## [0.2.0] = 2026-08-05

- Added context and prompt builders.

## [0.1.0] - 2026-07-22

### Added

- Created initial FastAPI AI microservice structure.
- Added Docker configuration.
- Added health check endpoint.
- Added modular project structure:
  - api
  - services
  - models (Pydantic models)
  - prompts
  - clients
- Added initial environment configuration.
- Defined initial AI service architecture.
