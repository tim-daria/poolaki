# Hybrid RAG
import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod

from app.clients.django import DjangoClient, DjangoClientError
from app.config.settings import settings
from app.services.intention import ENDPOINT_BY_INTENT, Intent
from models.retrieval import CombinedRetrievalResult, RetrievedItem
from models.usage import TokenUsage

logger = logging.getLogger(__name__)

# Errors that must reach the user (403/400); anything else degrades to vectors only
PROPAGATED_ERROR_CODES = {"FORBIDDEN", "INVALID_REQUEST"}

class MockDocumentRepository:
    """TESTING ONLY: Temporal mock to simulate vector search."""

    async def search_documents(
        self, query: str, usage: TokenUsage, top_k: int = 3
    ) -> list[str]:
        return [f"doc_{i}" for i in range(top_k)]


class BaseRetriever(ABC):
    @abstractmethod
    async def get_context(
        self,
        user_id: int,
        organization_id: int,
        query: str,
        usage: TokenUsage,
        intent: Intent | None = None,
        top_k: int | None = None,
    ) -> CombinedRetrievalResult:
        pass


class Retriever(BaseRetriever):
    def __init__(
        self,
        doc_repo: MockDocumentRepository,
        django_client: DjangoClient,
    ):
        self._doc_repo = doc_repo
        self._django_client = django_client

    def _resolve_endpoint_from_intent(
        self,
        intent: Intent | None,
    ) -> str | None:
        path = ENDPOINT_BY_INTENT.get(intent)
        return f"/api/internal/v1/{path}/" if path else None

    async def get_context(
        self,
        user_id: int,
        organization_id: int,
        query: str,
        usage: TokenUsage,
        intent: Intent | None = None,
        top_k: int | None = None,
    ) -> CombinedRetrievalResult:

        top_k = top_k or settings.vector_top_k
        start = time.perf_counter()
        endpoint = self._resolve_endpoint_from_intent(intent)
        payload = {"user_id": user_id, "organization_id": organization_id}

        # Vectors always run; Django only if the intent has an endpoint
        tasks = [self._doc_repo.search_documents(query=query, usage=usage, top_k=top_k)]
        if endpoint is not None:
            tasks.append(self._django_client.fetch_backend_data(endpoint, payload))

        results = await asyncio.gather(*tasks, return_exceptions=True)  # to run vectors in parallel

        docs = results[0]
        if isinstance(docs, Exception):
            raise docs  # a vector failure is a real error

        items = [
            RetrievedItem(
                type="unstructured_doc",
                content=doc,
                source="vector_db",
                metadata={},
            )
            for doc in docs
        ]

        structured = None
        degraded = False
        if endpoint is not None:
            outcome = results[1]
            if (
                isinstance(outcome, DjangoClientError)
                and outcome.code in PROPAGATED_ERROR_CODES
            ):
                raise outcome  # chat.py maps it to 403/400
            if isinstance(outcome, Exception):
                degraded = True  # network down, 5xx...: continue with vectors only
                logger.warning(
                    "django_degraded",
                    extra={"endpoint": endpoint, "error": type(outcome).__name__},
                )
            elif outcome:
                structured = outcome

        if structured:
            items.append(
                RetrievedItem(
                    type="structured_data",
                    content=json.dumps(structured, ensure_ascii=False),
                    source="django_api",
                    metadata={"endpoint": endpoint},
                )
            )
        elif degraded:
            items.append(
                RetrievedItem(
                    type="system_note",
                    content="The user's financial data is temporarily unavailable.",
                    source="system",
                    metadata={},
                )
            )

        logger.info(
            "retrieval_done",
            extra={
                "intent": intent,
                "endpoint": endpoint,
                "docs": len(docs),
                "has_structured": bool(structured),
                "degraded": degraded,
                "retrieval_ms": round((time.perf_counter() - start) * 1000),
            },
        )
        return CombinedRetrievalResult(items=items)
