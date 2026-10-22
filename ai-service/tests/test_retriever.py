import json

import pytest

from app.clients.django import DjangoClientError
from app.services.intention import Intent
from app.services.retrieval import Retriever
from models.usage import TokenUsage


class FakeDjango:
    """Local fake: returns contract-shaped data or raises the given error."""

    def __init__(self, error: DjangoClientError | None = None):
        self._error = error

    async def fetch_backend_data(self, endpoint: str, payload: dict) -> dict:
        if self._error:
            raise self._error
        return {"year": 2026, "balance": "3500.00", "months": []}


class FakeVectorSearchService:
    async def search(self, query: str, limit: int = 5) -> list[dict]:
        return [{"content": f"doc_{i}"} for i in range(limit)]


def make_retriever(error: DjangoClientError | None = None) -> Retriever:
    return Retriever(
        doc_repo=FakeVectorSearchService(), django_client=FakeDjango(error)
    )


@pytest.mark.asyncio
async def test_retriever_combines_vector_docs_and_django_data():
    result = await make_retriever().get_context(
        user_id=123,
        organization_id=456,
        query="How much did I spend?",
        usage=TokenUsage(),
        intent=Intent.SUMMARY,
        top_k=2,
    )

    types = [i.type for i in result.items]
    assert types.count("unstructured_doc") == 2
    assert types.count("structured_data") == 1

    structured = next(i for i in result.items if i.type == "structured_data")
    assert structured.metadata["endpoint"] == "/api/internal/v1/analytics/summary/"
    assert json.loads(structured.content)["year"] == 2026


@pytest.mark.asyncio
async def test_unsupported_intent_does_not_call_django():
    retriever = make_retriever(DjangoClientError("FORBIDDEN", "no", 403))

    result = await retriever.get_context(
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
    retriever = make_retriever(DjangoClientError("FORBIDDEN", "no", 403))

    with pytest.raises(DjangoClientError) as exc:
        await retriever.get_context(
            user_id=0,
            organization_id=456,
            query="x",
            usage=TokenUsage(),
            intent=Intent.TRANSACTIONS,
        )
    assert exc.value.code == "FORBIDDEN"


@pytest.mark.asyncio
async def test_backend_failure_degrades_with_system_note():
    retriever = make_retriever(DjangoClientError("INTERNAL_ERROR", "down", 502))

    result = await retriever.get_context(
        user_id=1,
        organization_id=1,
        query="x",
        usage=TokenUsage(),
        intent=Intent.SUMMARY,
        top_k=1,
    )

    assert [i.type for i in result.items] == ["unstructured_doc", "system_note"]
