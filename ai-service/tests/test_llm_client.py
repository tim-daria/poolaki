import httpx
import pytest

from app.clients.llm import LLMClient


@pytest.mark.asyncio
async def test_llm_success():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": "Hello!"}},
                ]
            },
        )

    client = LLMClient()
    await client._client.aclose()
    client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="http://test",
    )

    result = await client.generate_response("Hello")

    assert result == "Hello!"

    await client.close()