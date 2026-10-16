"""Behavior tests for the real Django internal API client."""

import json

import httpx
import pytest

from app.clients.django import DjangoClient

SUMMARY_ENDPOINT = "/api/internal/v1/analytics/summary/"
PAYLOAD = {"user_id": 1, "organization_id": 2}


def _with_mock(client: DjangoClient, handler) -> None:
    """Point the client at a mock transport that resolves the relative path."""
    client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler), base_url="http://test"
    )


@pytest.mark.asyncio
async def test_fetch_posts_json_to_internal_endpoint():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == SUMMARY_ENDPOINT
        assert json.loads(request.content) == PAYLOAD
        return httpx.Response(
            200,
            json={
                "year": 2026,
                "balance": "3500.00",
                "totals": {"income": "25000.00", "expense": "8500.00"},
                "months": [{"month": 1, "income": "2500.00", "expense": "850.00"}],
            },
        )

    client = DjangoClient()
    await client._client.aclose()
    _with_mock(client, handler)

    result = await client.fetch_backend_data(SUMMARY_ENDPOINT, PAYLOAD)

    assert result["year"] == 2026
    assert result["balance"] == "3500.00"

    await client.close()


@pytest.mark.asyncio
async def test_fetch_returns_empty_dict_on_http_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            500, json={"error": {"code": "INTERNAL_ERROR", "message": "boom"}}
        )

    client = DjangoClient()
    await client._client.aclose()
    _with_mock(client, handler)

    result = await client.fetch_backend_data(SUMMARY_ENDPOINT, PAYLOAD)

    assert result == {}

    await client.close()


@pytest.mark.asyncio
async def test_fetch_returns_empty_dict_on_timeout():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("connect timeout")

    client = DjangoClient()
    await client._client.aclose()
    _with_mock(client, handler)

    result = await client.fetch_backend_data(SUMMARY_ENDPOINT, PAYLOAD)

    assert result == {}

    await client.close()
