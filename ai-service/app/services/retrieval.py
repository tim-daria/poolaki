# Hybrid RAG
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from app.models.retrieval import CombinedRetrievalResult
from app.clients.mock_repository import MockDocumentRepository, MockDjangoClient

class BaseRetriever(ABC):
    @abstractmethod
    async def get_context(
        self,
        user_id: int,
        organization_id: int,
        query: str,
        intent: Optional[str] = None,
        top_k: int = 3
    ) -> CombinedRetrievalResult:
        pass


class MockRetriever(BaseRetriever):
    def __init__(self, doc_repo: MockDocumentRepository, django_client: MockDjangoClient):
        self._doc_repo = doc_repo
        self._django_client = django_client

    def _resolve_endpoint_from_intent(self, intent: Optional[str]) -> Optional[str]:
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
        intent: Optional[str] = None,
        top_k: int = 3
    ) -> CombinedRetrievalResult:
        
        documents = await self._doc_repo.search_documents(query=query, top_k=top_k)
        
        endpoint = self._resolve_endpoint_from_intent(intent)
        structured_data = None
        
        if endpoint is not None:
            payload = {
                "user_id": user_id,
                "organization_id": organization_id
            }
            structured_data = await self._django_client.fetch_backend_data(endpoint, payload)

        return CombinedRetrievalResult(
            query=query,
            documents=documents,
            structured_data=structured_data
        )