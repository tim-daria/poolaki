# Hybrid RAG
import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod

from app.clients.django import MockDjangoClient
from app.config.settings import settings
from app.services.intention import ENDPOINT_BY_INTENT, Intent
from models.retrieval import CombinedRetrievalResult, RetrievedItem
from models.usage import TokenUsage

logger = logging.getLogger(__name__)

class MockDocumentRepository:
    """TESTING ONLY: Mock temporal para simular búsqueda en base de datos vectorial."""

    async def search_documents(self, query: str, top_k: int = 3) -> list[str]:
        return [f"doc_{i}" for i in range(top_k)]


class BaseRetriever(ABC):
    @abstractmethod
    async def get_context(
        self,
        user_id: int,
        organization_id: int,
        query: str,
        intent: str | None = None,
        top_k: int = settings.vector_top_k,
    ) -> CombinedRetrievalResult:
        pass


class MockRetriever(BaseRetriever):
    def __init__(
        self,
        doc_repo: MockDocumentRepository,
        django_client: MockDjangoClient,
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
        top_k: int = 3,
    ) -> CombinedRetrievalResult:

        start = time.perf_counter()
        endpoint = self._resolve_endpoint_from_intent(intent)
        payload = {"user_id": user_id, "organization_id": organization_id}

        tasks = [self._doc_repo.search_documents(query=query, usage=usage, top_k=top_k)]
        if endpoint is not None:
            tasks.append(self._django_client.fetch_backend_data(endpoint, payload))

        results = await asyncio.gather(*tasks) #to run vectors in parallel

        items = [
            RetrievedItem(
                type="unstructured_doc",
                content=doc,
                source="vector_db",
                metadata={},
            )
            for doc in results[0]
        ]

        if endpoint is not None and results[1]:
            items.append(
                RetrievedItem(
                    type="structured_data",
                    content=json.dumps(results[1], ensure_ascii=False),
                    source="django_api",
                    metadata={"endpoint": endpoint},
                )
            )

        logger.info(
            "retrieval_done",
            extra={
                "intent": intent,
                "endpoint": endpoint,
                "docs": len(results[0]),
                "has_structured": endpoint is not None and bool(results[1]),
                "retrieval_ms": round((time.perf_counter() - start) * 1000),
            },
        )
        return CombinedRetrievalResult(items=items)
