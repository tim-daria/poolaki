import pytest
from app.clients.mock_repository import MockDocumentRepository, MockDjangoClient
from app.services.retriever import MockRetriever
from app.models.retrieval import CombinedRetrievalResult

@pytest.mark.asyncio
async def test_mock_retriever_returns_structured_format():
    doc_repo = MockDocumentRepository()
    django_client = MockDjangoClient()
    retriever = MockRetriever(doc_repo=doc_repo, django_client=django_client)

    result = await retriever.get_context(
        user_id=123,
        organization_id=456,
        query="¿Cuánto gasté este mes?",
        intent="monthly_summary",
        top_k=2
    )

    assert isinstance(result, CombinedRetrievalResult)
    assert len(result.documents) == 2
    assert result.structured_data is not None
    assert result.structured_data["total_expenses"] == 850


@pytest.mark.asyncio
async def test_mock_retriever_top_k_limit():
    doc_repo = MockDocumentRepository()
    django_client = MockDjangoClient()
    retriever = MockRetriever(doc_repo=doc_repo, django_client=django_client)

    result = await retriever.get_context(
        user_id=123,
        organization_id=456,
        query="Información de metas",
        top_k=1
    )

    assert len(result.documents) == 1