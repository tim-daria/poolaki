
from models.context import CombinedRetrievalResult
from app.services.context_builder import ContextBuilder

# Transform financial data
def test_build_financial_context():

    result = CombinedRetrievalResult(user_id=123, question="Why am I spending more?",
        financial_data={ "current_month_expenses":850, "previous_month_expenses":700}
    )

    builder=ContextBuilder()

    context=builder.build_context(result)

    assert len(context)==1

    assert (context[0].type=="financial_summary")

    assert "21%" in context[0].content

# Add vector context
def test_add_semantic_context():

    result=CombinedRetrievalResult(user_id=123,question="What is food category?",
        semantic_documents=["Food means groceries and restaurants"])

    context=ContextBuilder().build_context(result)

    assert context[0].type=="semantic_knowledge"

# Test limit
def test_context_size_limit():

    result=CombinedRetrievalResult(user_id=1, question="test",
        semantic_documents=["x"*5000])

    context=ContextBuilder().build_context(result)

    assert len(context)==0

# Empty context
def test_empty_context():

    result=CombinedRetrievalResult(user_id=1, question="hello")

    context=ContextBuilder().build_context(result)

    assert context==[]

#  Zero division
def test_build_financial_context_handles_zero_previous_expenses():
    result = CombinedRetrievalResult(user_id=123, question="Why am I spending more?",
        financial_data={"current_month_expenses": 500, "previous_month_expenses": 0}
    )

    context = ContextBuilder().build_context(result)

    assert len(context) == 1
    assert "Current month: €500" in context[0].content

#  MAX Content Length
def test_context_size_limit_does_not_exceed_max_length():
    result = CombinedRetrievalResult(user_id=1, question="test", semantic_documents=[
            "a" * 3000, "b" * 3000])

    context = ContextBuilder().build_context(result)

    total_length = sum(len(item.content) for item in context)

    assert total_length <= ContextBuilder.MAX_CONTEXT_LENGTH