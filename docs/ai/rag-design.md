# RAG Architecture Design — Poolaki AI Assistant

## Overview
This document defines the Retrieval-Augmented Generation (RAG) architecture for the Poolaki AI Assistant. The system employs a hybrid retrieval model to combine structured financial data (e.g., account balances, transaction history) retrieved via Django with unstructured/semantic domain knowledge (e.g., financial guides, category rules) stored in vector embeddings.

---

## 1. High-Level RAG Architecture
The AI Assistant uses a `hybrid RAG` pipeline. When a user submits a question, the `AI Service` first passes the query to the `LLM` to interpret the user's intent and identify the required financial context. 

Based on this intent, the `AI Service` requests specific structured financial data (e.g., balances and transactions) from `Django`, while simultaneously querying `pgvector` for relevant unstructured domain knowledge (e.g., category rules). 

The Retriever gathers both data sources, the Context Builder formats them into an LLM ready context. The Prompt Builder constructs the final system prompt, and the LLM Client generates the final response.

+-------------------+
                  |   User Question   |
                  +-------------------+
                            |
                            v
                  +-------------------+
                  |    AI Service     |
                  | 1. Interpret Intent
                  +-------------------+
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
        +-------------------+
        |     Response      |
        +-------------------+
---

## 2. Component Responsibilities & Interfaces

The RAG pipeline operates sequentially through four core components inside the `ai-service`:

### 2.1 Retriever (`app/services/retriever.py`)
**Responsibility:** Coordinates hybrid data gathering.
  - Fetches user-specific financial facts provided by `Django` in the initial HTTP payload (structured context).
  - Queries `pgvector` for relevant semantic domain documents/rules based on embedding similarity (unstructured context).
- **Interface:**
  ```python
  class Retriever:
      async def get_context(
          self, 
          user_id: str, 
          query: str, 
          raw_django_data: dict
      ) -> CombinedRetrievalResult:
          ...

### 2.2 Context Builder (`app/services/context_builder.py`)
**Responsibility:** Normalizes, filters, and formats raw data into a clean, LLM-ready text format. Enforces token/character limits to prevent context bloat.

**Interface:**

```Python
class ContextBuilder:
    def build_context(self, retrieval_result: CombinedRetrievalResult) -> str:
```
### 2.3 Prompt Builder (`app/services/prompt_builder.py`)
**Responsibility:** Loads system and assistant prompts (`system_base.md`, `financial_assistant_v0.md`), injects the sanitized context  and appends the user's question.

**Interface:**

```Python
class PromptBuilder:
    def build_prompt(self, user_question: str, context: str) -> str:
```
### 2.4 LLM Client (`app/clients/llm_client.py`)
**Responsibility:** Sends the assembled prompt to the LLM Provider (NVIDIA / OpenAI / Local model), handles streaming responses, timeouts, and fallback errors.

**Interface:**

```Python
class LLMClient:
    async def generate_response(self, prompt: str) -> str:
```
## 3. End-to-End Data Flow
**3.1. User Request:** User asks a financial question in the Frontend.

**3.2. Django Authorization & Fact Assembly:**

Django authenticates the user.

Django queries PostgreSQL for user balance, recent transactions, and relevant business facts.

Django sends an HTTP POST request to `ai-service`containing the user query and the user's financial scope payload.

**3.3. AI Service Processing:**

Retriever parses Django's payload and queries pgvector for semantic context matching the prompt.

Context Builder merges structured financial state with vector search results into a clean string bounded by token caps.

Prompt Builder substitutes {{context}} and {{user_question}} into the Markdown templates.

LLM Client transmits the final prompt payload to the external LLM provider.

**3.4. Response Delivery:**

LLM output streams/returns back to ai-service.

ai-service responds to Django, which passes the result back to the user.

## 4. Dependencies & Technical Choices
**Database:** `PostgreSQL` + `pgvector` (holds document chunks and vector embeddings).

**Embeddings:** NVIDIA / OpenAI embedding model for semantic retrieval.

**Security & Multi-Tenancy:*** User financial data isolation is guaranteed at the Django API boundary before reaching `ai-service`.