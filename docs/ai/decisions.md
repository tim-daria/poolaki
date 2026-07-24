# AI Service Decisions

## Decision 1: Keep AI as an independent microservice

### Context

AI workflows evolve independently from the core application business logic and may require different scaling, deployment, and technology choices.

### Decision

AI capabilities will be implemented in a dedicated FastAPI microservice, separated from the Django backend.

### Reason

- Allows independent scaling of AI workloads.
- Keeps Django responsible for business rules, users, and financial data ownership.
- Enables changing LLM providers or AI components without impacting the main backend.
- Reduces coupling between application logic and AI infrastructure.

### Consequences

- AI Service owns AI-specific workflows.
- Django remains the owner of business logic and user data.
- Communication happens through defined API contracts.

---

## Decision 2: Keep financial data ownership in Django

### Context

The application already uses Django as the source of truth for users, organizations, transactions, and financial data.

### Decision

The AI Service will not directly access PostgreSQL. Required data will be provided by Django through APIs.

### Reason

This keeps data ownership, authorization rules, and business logic centralized in the backend.

### Consequences

- Django validates access permissions before sharing data.
- AI Service focuses on retrieval, context preparation, and LLM interaction.
- Database schema changes remain isolated from AI workflows.