# Changelog

All notable changes to this project will be documented in this file.

## [0.6.0] - 2026-10-22

### Added

- Integrated the real `DjangoClient` with the internal API contract (`analytics/summary`, `categories`, `transactions`).
- Added per-request token counting (`TokenUsage`, `LLMUsage`) and per-stage latency logging (`intent_classified`, `retrieval_done`, `llm_final_done`, `chat_completed`).
- Added data-window information and token-budget trimming of `transactions` in the context builder.
- Added scope, data, security, language and formatting rules to the system prompt.
- Added `<context>` and `<user_question>` delimiters to the prompts.
- Added `DjangoClientError` and its HTTP mapping in the chat endpoint (403, 400).

### Changed

- Intents are now `summary`, `categories`, `transactions` and `unsupported`; unknown labels no longer raise an error.
- Retriever runs vector search and Django calls in parallel and degrades to vector-only context when the backend fails.
- `LLMClient.generate_response` now returns `(text, LLMUsage)`.
- `PromptBuilder` fills placeholders in a single pass and receives `today` as a `date` from `LLMService`.
- JSON logs now include all `extra` fields.
- Moved `database_url` to `settings.py`; added `max_context_tokens`, `min_similarity` and `vector_top_k`.

### Removed

- Removed `MockDjangoClient` and the goals endpoints from the supported flow.

## [0.5.0] - 2026-09-30

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

## [0.4.0] - 2026-09-23

### Added

- Added configurable LLM retry and fallback mechanisms.
- Added configurable LLM request timeout and retry attempts.
- Added LLM HTTP error handling and `LLMClientError`.
- Added structured logging for LLM requests, attempts, models, errors, and response timing.
- Made the fallback LLM model optional.

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
