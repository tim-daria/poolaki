import json

import pytest

from app.clients.django import DjangoClientError, MockDjangoClient
from app.services.intention import Intent
from app.services.retrieval import MockDocumentRepository, MockRetriever
from models.usage import TokenUsage


def make_retriever() -> MockRetriever:
    return MockRetriever(
        doc_repo=MockDocumentRepository(), django_client=MockDjangoClient()
    )


@pytest.mark.asyncio
async def test_retriever_combines_vector_docs_and_django_data():
    result = await make_retriever().get_context(
        user_id=123,
        organization_id=456,
        query="How much did I spend?",
        usage=TokenUsage(),
        intent=Intent.MONTHLY_SUMMARY,
        top_k=2,
    )

    types = [i.type for i in result.items]
    assert types.count("unstructured_doc") == 2
    assert types.count("structured_data") == 1

    structured = next(i for i in result.items if i.type == "structured_data")
    assert structured.metadata["endpoint"] == "/api/internal/v1/analytics/summary/"
    assert len(json.loads(structured.content)["months"]) == 12


@pytest.mark.asyncio
async def test_unsupported_intent_does_not_call_django():
    result = await make_retriever().get_context(
        user_id=123,
        organization_id=456,
        query="goal progress",
        usage=TokenUsage(),
        intent=Intent.UNSUPPORTED,
        top_k=1,
    )

    assert all(i.type == "unstructured_doc" for i in result.items)


@pytest.mark.asyncio
async def test_forbidden_user_raises_django_error():
    with pytest.raises(DjangoClientError) as exc:
        await make_retriever().get_context(
            user_id=0,
            organization_id=456,
            query="x",
            usage=TokenUsage(),
            intent=Intent.TRANSACTIONS,
        )
    assert exc.value.code == "FORBIDDEN"
