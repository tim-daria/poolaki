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

**Backend** = source of truth.

**AI** = natural language interface.

### Reason

This keeps data ownership, authorization rules, and business logic centralized in the backend.

### Consequences

- Django validates access permissions before sharing data.
- AI Service focuses on retrieval, context preparation, and LLM interaction.
- Database schema changes remain isolated from AI workflows.

---

## Decision 3: Vector Retrieval Usage

### Context
Some supported questions can be answered from the SQL retrieval but others might need vector retrieval.


### Decision
Vector retrieval is used only for semantic context.


### Reason
Examples:
- Financial explanations.
- User-provided documents.
- Knowledge base information.


### Consequences
- The information we'll be retrieved from SQL and vectors.

---

## Decision 4: Organization-based Data Isolation

### Context
The AI chat will be available in the different accounts, so it's necessary to determinate which information will be retrieved.

### Decision
The AI assistant operates within the user's current organization context.

The backend is responsible for:
- validating organization membership
- enforcing permissions
- retrieving only authorized financial data

### Reason

### Consequences
The AI service never accesses data directly from the database and never decides which organization data can be used.

If the organization has only one member, it represents personal expenses.

If multiple members exist, it includes shared organization data according to permissions.

---
## Decision 5: AI Assistant Scope

### Context
The chat with the ai assitant might look open to any questions to the user.

### Decision
The AI Assistant is designed to help users understand their own financial data.

### Reason
Keeping the AI focused on data interpretation ensures that financial calculations remain controlled by the backend while avoiding unsupported financial advisory features, which can have legal implications.

### Consequences
The AI Assistant focuses on:
- Explaining user data.
- Answering questions about Poolaki data.
- Helping users understand their transactions, categories, goals, and financial activity.

The AI Assistant does not provide:
- Financial advice.
- Investment recommendations.
- Personalized financial planning.

---
## Decision 6: AI Interaction Tracking

### Context
The AI Assistant needs traceability of user questions, intents, retrieval methods, and data sources used to generate responses.

### Decision
Store AI requests in a dedicated ai_interactions table managed by the main backend.

### Reason
Enabling debugging, testing, and monitoring of AI behavior.

### Consequence
The backend becomes responsible for storing AI interaction metadata.

The AI Service remains focused on processing requests and generating responses.

---

## Decision 7: AI Service Monitoring with Grafana

### Context
The AI Service introduces additional operational risks such as latency, retrieval failures, and model/service errors.

### Decision
If defined, should be expose AI Service metrics to Prometheus and visualize them through Grafana dashboards.

### Reason
Monitoring helps detect performance issues, failures, and usage patterns during development and deployment.

### Consequences
The AI Service must expose measurable metrics (e.g., request latency, errors, retrieval types), and Infra must configure monitoring infrastructure.