import httpx
import pytest

from app.clients.llm import LLMClient
from app.config.settings import settings
from models.usage import LLMUsage


async def make_client(payload: dict) -> LLMClient:
    client = LLMClient()
    await client._client.aclose()
    client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda request: httpx.Response(200, json=payload)
        ),
        base_url="http://test",
    )
    return client


@pytest.mark.asyncio
async def test_llm_success_returns_text_and_usage():
    client = await make_client(
        {
            "choices": [{"message": {"content": "Hello!"}}],
            "usage": {"prompt_tokens": 12, "completion_tokens": 3},
        }
    )

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


@pytest.mark.asyncio
async def test_embedding_client_uses_embedding_config(monkeypatch):
    monkeypatch.setattr(settings, "embedding_base_url", "http://embed")
    monkeypatch.setattr(settings, "embedding_api_key", "embed-key")

    client = LLMClient()

    assert str(client._embedding_client.base_url).rstrip("/") == "http://embed"
    assert client._embedding_client.headers["Authorization"] == "Bearer embed-key"
    await client.close()


@pytest.mark.asyncio
async def test_generate_embeddings_uses_embedding_client(monkeypatch):
    monkeypatch.setattr(settings, "embedding_base_url", "http://embed")
    monkeypatch.setattr(settings, "embedding_api_key", "embed-key")
    client = LLMClient()
    await client._embedding_client.aclose()

    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["authorization"] = request.headers["authorization"]
        return httpx.Response(
            200,
            json={
                "data": [{"embedding": [0.1, 0.2]}],
                "usage": {"prompt_tokens": 2},
            },
        )

    client._embedding_client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="http://embed",
        headers={"Authorization": "Bearer embed-key"},
    )

    embeddings = await client.generate_embeddings(["hello"])

    assert embeddings == [[0.1, 0.2]]
    assert seen == {
        "url": "http://embed/embeddings",
        "authorization": "Bearer embed-key",
    }
    await client.close()


@pytest.mark.asyncio
async def test_embedding_client_falls_back_to_llm_config(monkeypatch):
    monkeypatch.setattr(settings, "embedding_base_url", None)
    monkeypatch.setattr(settings, "embedding_api_key", None)

    client = LLMClient()

    assert str(client._embedding_client.base_url).rstrip("/") == "http://test"
    assert client._embedding_client.headers["Authorization"] == "Bearer test"
    await client.close()
