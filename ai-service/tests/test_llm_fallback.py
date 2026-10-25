import httpx
import pytest

from app.clients.llm import LLMClient
from app.config.settings import settings


@pytest.mark.asyncio
async def test_llm_fallback():
    responses = [
        httpx.Response(503),
        httpx.Response(503),
        httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "Fallback!"}}],
                "usage": {"prompt_tokens": 7, "completion_tokens": 2},
            },
        ),
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        return responses.pop(0)

    client = LLMClient()
    await client._client.aclose()
    client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="http://test",
    )

    settings.llm_fallback_model = "fallback-model"

    text, usage = await client.generate_response("Hello")

    assert text == "Fallback!"

    assert usage.input_tokens == 7

    await client.close()
