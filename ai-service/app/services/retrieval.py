# Hybrid RAG
import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Protocol

from app.clients.django import DjangoClientError
from app.config.settings import settings
from app.services.intention import ENDPOINT_BY_INTENT, Intent
from models.retrieval import CombinedRetrievalResult, RetrievedItem
from models.usage import TokenUsage

logger = logging.getLogger(__name__)

# Errors that must reach the user (403/400); anything else degrades to vectors only
PROPAGATED_ERROR_CODES = {"FORBIDDEN", "INVALID_REQUEST"}


class BackendClient(Protocol):
    async def fetch_backend_data(
        self, endpoint: str, payload: dict[str, Any]
    ) -> dict[str, Any]: ...


class DocumentRepositoryProtocol(Protocol):
    async def search(
        self, query: str, limit: int = settings.vector_top_k
    ) -> list[dict[str, Any]]: ...


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
        doc_repo: DocumentRepositoryProtocol,
        django_client: BackendClient,
    ):
        self._doc_repo = doc_repo
        self._django_client = django_client

    def _resolve_endpoint_from_intent(
        self,
        intent: Intent | None,
    ) -> str | None:
        if intent is None:
            return None
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
        vector_task = self._doc_repo.search(query=query, limit=top_k)

        outcome: dict[str, Any] | BaseException | None = None
        if endpoint is not None:
            docs_result, outcome = await asyncio.gather(
                vector_task,
                self._django_client.fetch_backend_data(endpoint, payload),
                return_exceptions=True,
            )
        else:
            docs_result = (await asyncio.gather(vector_task, return_exceptions=True))[0]
            outcome = None

        if isinstance(docs_result, BaseException):
            raise docs_result  # a vector failure is a real error

        raw_docs = docs_result  # real raw content received back
        docs: list[str] = [doc.get("content", "") for doc in raw_docs]
        doc_similarities = [
            {
                "id": doc.get("id"),
                "source": (doc.get("metadata") or {}).get("source"),
                "similarity": doc.get("similarity"),
            }
            for doc in raw_docs
        ]

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
                "docs": docs,
                "doc_similarities": doc_similarities,
                "min_similarity": settings.min_similarity,
                "has_structured": bool(structured),
                "degraded": degraded,
                "retrieval_ms": round((time.perf_counter() - start) * 1000),
            },
        )
        return CombinedRetrievalResult(items=items)
