import httpx
import pytest

from app.clients.llm import LLMClient
from models.usage import LLMUsage


async def make_client(payload: dict) -> LLMClient:
    client = LLMClient()
    await client._client.aclose()
    client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload)),
        base_url="http://test",
    )
    return client


@pytest.mark.asyncio
async def test_llm_success_returns_text_and_usage():
    client = await make_client({
        "choices": [{"message": {"content": "Hello!"}}],
        "usage": {"prompt_tokens": 12, "completion_tokens": 3},
    })

    text, usage = await client.generate_response("Hello")

    assert text == "Hello!"
    assert usage == LLMUsage(input_tokens=12, output_tokens=3)
    await client.close()


@pytest.mark.asyncio
async def test_llm_missing_usage_defaults_to_zero():
    client = await make_client({"choices": [{"message": {"content": "Hello!"}}]})

    _, usage = await client.generate_response("Hello")

    assert usage == LLMUsage(input_tokens=0, output_tokens=0)
    await client.close()