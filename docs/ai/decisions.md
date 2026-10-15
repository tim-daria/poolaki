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

The AI Service will not directly access PostgreSQL to access user's information. Required data will be provided by Django through APIs.

The AI Service may connect directly to PostgreSQL with pgvector for global Poolaki knowledge documents.

**Backend** = source of truth.

**AI** = natural language interface.

### Reason

- This keeps data ownership, authorization rules, and business logic centralized in the backend.
- Keeps semantic retrieval independent from Django's financial data APIs.

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

---

## Decision 8: Global Knowledge Document Storage

### Context

The AI Assistant needs semantic access to global Poolaki documentation, financial concepts, category definitions, and product knowledge.

### Decision

Global knowledge documents will be stored in PostgreSQL using the pgvector extension.

The AI Service will access this database directly through a dedicated database connection.

### Reason

- Keeps semantic retrieval independent from Django's financial data APIs.
- Reuses the existing PostgreSQL infrastructure.
- Avoids introducing a separate vector database service.

### Consequences

- PostgreSQL must support the `pgvector` extension.
- The AI Service requires dedicated database credentials.
- The vector database must not contain private financial records in the initial implementation.
- Database access must be restricted to the required tables and operations.

---

## Decision 9: Embedding Generation

### Context

Semantic retrieval requires document chunks and user queries to be represented as vectors in the same embedding space.

### Decision

The initial implementation will use an external embedding API.

The same embedding model will be used for document ingestion and query embedding generation.

### Reason

- Avoids requiring GPU infrastructure.
- Keeps model execution outside the Docker container.
- Reduces operational complexity for the initial implementation.

### Consequences

- The AI Service depends on the availability and limits of the embedding provider.
- API credentials must be managed securely.
- Embedding costs and latency must be monitored.
- Changing the embedding model requires regenerating existing document embeddings.

---

## Decision 10: Document Ingestion and Chunking

### Context

Knowledge documents must be transformed into smaller units that can be retrieved by semantic similarity.

### Decision

Knowledge documents will be maintained as `Markdown` files organized by domain.

The ingestion pipeline will normalize document content, split it into chunks, generate embeddings, and store the results in PostgreSQL.

### Reason

- `Markdown` is easy to maintain and review through `Git`.
- A consistent document structure simplifies ingestion.
- Chunking enables retrieval of relevant sections without loading entire documents.

### Consequences

- Documents must follow a consistent structure and include stable identifiers.
- Chunk size and overlap must be configurable or centrally defined.
- Document updates must trigger re-ingestion.
- Re-ingestion must avoid creating duplicate chunks.

---

## Decision 11: Exact Vector Search

### Context

The initial knowledge base is expected to be small, and the system prioritizes simplicity and maintainability.

### Decision

The initial implementation will use exact **similarity** search in `pgvector` _without_ approximate vector indexes.

### Reason

- Avoids premature index configuration and tuning.
- Provides a straightforward baseline for retrieval quality and latency.
- Keeps the initial database design simple.

### Consequences

- Query latency may increase as the number of vectors grows.
- Retrieval latency must be measured under realistic workloads.
- HNSW or IVFFlat may be evaluated in future versions if measurements justify their use.

---

## Decision 12: Global Knowledge Access and Security

### Context

The initial vector database stores global Poolaki knowledge documents shared across users and organizations.

Financial data remains private and is owned by `Django`.

### Decision

The AI Service will access only global knowledge documents through its direct `PostgreSQL` connection.

### Reason

- Maintains a clear separation between global knowledge and private financial information.
- Preserves Django's responsibility for financial data authorization.
- Reduces the complexity of multi-tenant vector retrieval for the initial implementation.

### Consequences

- The vector database must not store private financial records.
- The AI Service must use dedicated least-privilege database credentials.
- `PostgreSQL` must remain accessible only through private infrastructure.
- Future user-specific or organization-specific documents require a separate authorization design.

---

## Decision 13: RAG Pipeline Observability

### Context

The RAG pipeline includes multiple operations with different latency and failure characteristics.

### Decision

The AI Service will measure the latency of embedding generation, vector retrieval, Django API calls, context construction, and LLM generation.

### Reason

- Identifies bottlenecks across the complete request lifecycle.
- Helps distinguish retrieval latency from LLM generation latency.
- Supports future performance and cost optimization.

### Consequences

- Each pipeline stage must expose measurable timing information.
- Errors and retrieval outcomes should be logged consistently.
- Existing request-level timing will be retained.
- Dedicated metrics infrastructure may be introduced in a future version.
