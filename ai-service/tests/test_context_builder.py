from app.services.context_builder import ContextBuilder
from models.retrieval import CombinedRetrievalResult, RetrievedItem


# Multiple items
def test_build_context_with_multiple_items():
    result = CombinedRetrievalResult(
        items=[
            RetrievedItem(
                type="financial_summary",
                content="You spent €850 this month.",
                source="django_analytics",
                metadata={},
            ),
            RetrievedItem(
                type="semantic_knowledge",
                content="Food includes groceries and restaurants.",
                source="vector_db",
                metadata={},
            ),
        ]
    )

    context = ContextBuilder().build_context(result)

    assert "€850" in context
    assert "Food includes groceries and restaurants." in context


# Test limit
def test_context_size_limit():

    result = CombinedRetrievalResult(
        items=[
            RetrievedItem(
                type="document",
                content="x" * 5000,
                source="vector_db",
                metadata={},
            )
        ]
    )

    context = ContextBuilder().build_context(result)

    assert len(context) == ContextBuilder.MAX_CONTEXT_LENGTH


# Empty context
def test_empty_context():

    result = CombinedRetrievalResult(items=[])

    context = ContextBuilder().build_context(result)

    assert context == ""


#  MAX Content Length
def test_context_size_limit_does_not_exceed_max_length():
    result = CombinedRetrievalResult(
        items=[
            RetrievedItem(
                type="document",
                content="a" * 3000,
                source="vector_db",
                metadata={},
            ),
            RetrievedItem(
                type="document",
                content="b" * 3000,
                source="vector_db",
                metadata={},
            ),
        ]
    )

    context = ContextBuilder().build_context(result)

    assert len(context) <= ContextBuilder.MAX_CONTEXT_LENGTH
