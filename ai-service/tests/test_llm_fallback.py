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
            json={"choices": [{"message": {"content": "Fallback!"}}]},
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

    result = await client.generate_response("Hello")

    assert result == "Fallback!"

    await client.close()
