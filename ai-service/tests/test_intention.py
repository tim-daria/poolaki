from unittest.mock import AsyncMock

import pytest

from app.services.intention import Intent, IntentionService
from models.usage import LLMUsage, TokenUsage


def make_service(answer: str) -> IntentionService:
    llm = AsyncMock()
    llm.generate_response.return_value = (
        answer,
        LLMUsage(input_tokens=20, output_tokens=2),
    )
    return IntentionService(llm)


@pytest.mark.asyncio
async def test_classify_counts_tokens():
    usage = TokenUsage()
    intent = await make_service("summary").classify("How much did I spend?", usage)

    assert intent == Intent.SUMMARY
    assert (usage.intent_in, usage.intent_out) == (20, 2)


@pytest.mark.asyncio
async def test_classify_tolerates_quotes_and_dots():
    assert (
        await make_service('"transactions".').classify("q", TokenUsage())
        == Intent.TRANSACTIONS
    )


@pytest.mark.asyncio
async def test_classify_unknown_label_is_unsupported_but_still_counts_tokens():
    usage = TokenUsage()
    intent = await make_service("banana").classify("q", usage)

    assert intent == Intent.UNSUPPORTED
    assert usage.intent_in == 20
