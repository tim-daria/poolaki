# RAG Architecture Design — Poolaki AI Assistant

## Overview
This document defines the Retrieval-Augmented Generation (RAG) architecture for the Poolaki AI Assistant. The system employs a hybrid retrieval model to combine structured financial data (e.g., account balances, transaction history) retrieved via `Django` with unstructured/semantic domain knowledge (e.g., financial guides, category rules) stored in vector embeddings.

---

## 1. High-Level RAG Architecture
The AI Assistant uses a `hybrid RAG` pipeline. When a user submits a question, the `AI Service` first passes the query to the `LLM` to interpret the user's intent and identify the required financial context. 

Based on the detected intent, the `AI Service` executes the retrieval fetching structured financial data from `Django` (e.g., balances and transactions). querying semantic context from `pgvector`, or combining both as needed.

The retrieved context is then formatted and passed to the `LLM` to generate the final response.

```
                                    +-------------------+
                                    |   User Question   |
                                    +-------------------+
                                                |
                                                v
                +-----------------+   +--------------------+
                | External LLM    | < |     AI Service     |
                | Provider        | > | 1. Interpret Intent|
                +-----------------+   +--------------------++
                                                |
                            +------------------+------------------+
                            |                                     |
                            v                                     v
                            +-------------------+                 +--------------------+
                            |   Django API      |                 |     pgvector       |
                            | (Structured Data) |                 | (Unstructured Data)|
                            +-------------------+                 +--------------------+
                            |                                     |
                            +------------------+------------------+
                            |
                            v
                            +-------------------+
                            |     Retriever     |
                            +-------------------+
                            |
                            v
                            +-------------------+
                            |  Context Builder  |
                            +-------------------+
                            |
                            v
                            +-------------------+
                            |  Prompt Builder   |
                            +-------------------+
                            |
                            v
                            +-------------------+
                            |    LLM Client     |
                            +-------------------+
                            |
                            v
+-----------------+   +-------------------+
| External LLM    |-->|     Response      |
| Provider        |   +-------------------+
+-----------------+
```
---

## 2. Component Responsibilities & Interfaces

The RAG pipeline operates sequentially through four core components inside the `AI Service`:

### 2.1 Retriever (`app/services/retriever.py`)
**Responsibility:** Coordinates hybrid data gathering based on detected user intent.
  - Fetches structured financial data from `Django` on-demand when required by the query intent (e.g., account balances, transactions).
  - Queries `pgvector` for unstructured semantic context coming from documents, rules and definitions.

**Signature:**
  ```python
  class Retriever:
      async def get_context(
          self, 
          user_id: str, 
          org_id: str,
          query: str, 
          intent: str
      ) -> CombinedRetrievalResult:
          ...
```

### 2.2 Context Builder (`app/services/context_builder.py`)
**Responsibility:** Normalizes, filters, and formats raw data into a clean, LLM-ready text format. Enforces token/character limits to prevent context bloat.

**Signature:**

```Python
class ContextBuilder:
    def build_context(self, retrieval_result: CombinedRetrievalResult) -> str:
```
### 2.3 Prompt Builder (`app/services/prompt_builder.py`)
**Responsibility:** Loads system and assistant prompts (`system_base.md`, `financial_assistant_v0.md`), injects the sanitized context  and appends the user's question.

**Signature:**

```Python
class PromptBuilder:
    def build_prompt(self, user_question: str, context: str) -> str:
```
### 2.4 LLM Client (`app/clients/llm_client.py`)
**Responsibility:** Sends the assembled prompt to the LLM Provider (NVIDIA / OpenAI / Local model), handles streaming responses, timeouts, and fallback errors.

**Signature:**

```Python
class LLMClient:
    async def generate_response(self, prompt: str) -> str:
```
## 3. End-to-End Data Flow
**3.1. User Request:** User asks a financial question in the `Frontend`.

**3.2. Django Authorization:**

`Django` authorization process is:

- Authenticates the user.
- Verifies organization permissions.
- Forwards the user identity (`user_id`) and the context (`org_id`) along the user question, to `AI Service`.

More details about the communication between `Django` and `AI Service` on [API Contract](api-contract.md)

**3.3. AI Service Processing:**

`AI Service` is:
- Interprets the user query to detect intent and identify required context types.
- Executes targeted retrieval based on the intent:
   - Queries `Django REST APIs` for structured financial data (when financial facts are required).
   - Queries `pgvector` for unstructured semantic context (when domain knowledge is required).
   - Combines both data sources simultaneously when needed.

- Context Builder merges retrieved structured state and unstructured vector results into a clean, normalized string bounded by token caps.

- Prompt Builder injects `{{context}}` and `{{user_question}}` into the templates.

- LLM Client sends the final prompt payload to the external `LLM` provider.

**3.4. Response Delivery:**

1. External `LLM` output streams/returns back to `AI Service`.
2. `AI Service` sends the payload to`Django`.
3. `Django` passes the response back to the `Frontend`.

## 4. Dependencies & Technical Choices
**Database:** `PostgreSQL` + `pgvector` (holds document chunks and vector embeddings).

**Embeddings:** `NVIDIA` / `OpenAI` embedding model for semantic retrieval.

**Security & Multi-Tenancy:** User financial data isolation is guaranteed at the `Django` API boundary before reaching `AI Service`.