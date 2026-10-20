import json
from datetime import date

from app.services.context_builder import NO_CONTEXT, ContextBuilder
from models.retrieval import CombinedRetrievalResult, RetrievedItem
from models.usage import TokenUsage

TODAY = date(2026, 10, 20)


def structured(endpoint: str, data: dict) -> RetrievedItem:
    return RetrievedItem(
        type="structured_data", content=json.dumps(data),
        source="django_api", metadata={"endpoint": endpoint},
    )


def test_build_context_hides_internal_source_names():
    result = CombinedRetrievalResult(items=[
        RetrievedItem(type="unstructured_doc", content="Food includes groceries.",
                      source="vector_db", metadata={}),
    ])

    context = ContextBuilder().build_context(result, TokenUsage(), TODAY)

    assert "[product_docs]" in context
    assert "vector_db" not in context


def test_empty_context_returns_no_context_message():
    context = ContextBuilder().build_context(CombinedRetrievalResult(items=[]), TokenUsage(), TODAY)
    assert context == NO_CONTEXT


def test_summary_includes_year_window_and_sets_context_est():
    usage = TokenUsage()
    item = structured("/api/internal/v1/analytics/summary/", {"year": 2026, "balance": "3500.00"})

    context = ContextBuilder().build_context(CombinedRetrievalResult(items=[item]), usage, TODAY)

    assert "calendar year 2026" in context
    assert usage.context_est > 0


def test_transactions_window_starts_two_months_back():
    item = structured("/api/internal/v1/transactions/", {"transactions": []})
    context = ContextBuilder().build_context(CombinedRetrievalResult(items=[item]), TokenUsage(), TODAY)
    assert "2026-08-01" in context


def test_transactions_window_crosses_year_boundary():
    item = structured("/api/internal/v1/transactions/", {"transactions": []})
    context = ContextBuilder().build_context(
        CombinedRetrievalResult(items=[item]), TokenUsage(), date(2026, 1, 15)
    )
    assert "2025-11-01" in context


def test_transactions_are_trimmed_by_whole_rows_and_stay_valid_json():
    txs = [
        {"id": i, "date": "2026-10-01", "description": "Groceries", "entry_type": "expense",
         "category": "Food", "goal": None, "amount": "50.00"}
        for i in range(500)
    ]
    item = structured("/api/internal/v1/transactions/", {"transactions": txs})

    context = ContextBuilder().build_context(CombinedRetrievalResult(items=[item]), TokenUsage(), TODAY)

    json_line = context.split("\n")[1]
    kept = json.loads(json_line)["transactions"]  # fails if JSON was cut in half
    assert 0 < len(kept) < 500
    assert kept[0]["id"] == 0  # newest rows are kept
    assert "most recent of 500 transactions" in context