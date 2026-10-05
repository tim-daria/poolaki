# Changelog

All notable changes to this project will be documented in this file.

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
