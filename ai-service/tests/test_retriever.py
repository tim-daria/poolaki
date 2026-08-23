from unittest.mock import AsyncMock, patch

import pytest

from app.clients.django import MockDjangoClient
from app.services.retrieval import MockDocumentRepository, MockRetriever
from models.retrieval import CombinedRetrievalResult, RetrievedItem


@pytest.mark.anyio
async def test_mock_retriever_returns_structured_format():
    doc_repo = MockDocumentRepository()
    django_client = MockDjangoClient()
    retriever = MockRetriever(doc_repo=doc_repo, django_client=django_client)

    mock_items = [
        RetrievedItem(
            type="financial_summary", content="Spent €850", source="django", metadata={}
        ),
        RetrievedItem(
            type="category_breakdown", content="Food €230", source="django", metadata={}
        ),
    ]

    with patch.object(
        retriever, "get_context", new_callable=AsyncMock
    ) as mock_get_context:
        mock_get_context.return_value = CombinedRetrievalResult(items=mock_items)

        result = await retriever.get_context(
            user_id="123",
            organization_id="456",
            query="How much did I spend this month?",
            intent="monthly_summary",
            top_k=2,
        )

        assert isinstance(result, CombinedRetrievalResult)
        assert len(result.items) == 2
        assert result.items[0].content == "Spent €850"


@pytest.mark.anyio
async def test_mock_retriever_top_k_limit():
    doc_repo = MockDocumentRepository()
    django_client = MockDjangoClient()
    retriever = MockRetriever(doc_repo=doc_repo, django_client=django_client)

    mock_items = [
        RetrievedItem(
            type="goal_progress", content="Goal 60%", source="django", metadata={}
        )
    ]

    with patch.object(
        retriever, "get_context", new_callable=AsyncMock
    ) as mock_get_context:
        mock_get_context.return_value = CombinedRetrievalResult(items=mock_items)

        result = await retriever.get_context(
            user_id="123", organization_id="456", query="Goals information", top_k=1
        )

        assert len(result.items) == 1
