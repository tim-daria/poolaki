# Hybrid RAG
from abc import ABC, abstractmethod

from app.clients.django import MockDjangoClient
from models.retrieval import CombinedRetrievalResult, RetrievedItem


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
        top_k: int = 3,
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
        intent: str | None,
    ) -> str | None:
        if intent == "monthly_summary":
            return "/api/internal/v1/analytics/monthly-summary"
        if intent == "recent_transactions":
            return "/api/internal/v1/transactions"
        if intent == "goal_progress":
            return "/api/internal/v1/goals/progress"
        return None

    async def get_context(
        self,
        user_id: int,
        organization_id: int,
        query: str,
        intent: str | None = None,
        top_k: int = 3,
    ) -> CombinedRetrievalResult:

        documents = await self._doc_repo.search_documents(
            query=query,
            top_k=top_k,
        )

        items = [
            RetrievedItem(
                type="unstructured_doc",
                content=doc,
                source="vector_db",
                metadata={},
            )
            for doc in documents
        ]

        endpoint = self._resolve_endpoint_from_intent(intent)

        if endpoint is not None:
            payload = {
                "user_id": user_id,
                "organization_id": organization_id,
            }

            structured_data = await self._django_client.fetch_backend_data(
                endpoint,
                payload,
            )

            if structured_data:
                items.append(
                    RetrievedItem(
                        type="structured_data",
                        content=str(structured_data),
                        source="django_api",
                        metadata=structured_data,
                    )
                )

        return CombinedRetrievalResult(items=items)