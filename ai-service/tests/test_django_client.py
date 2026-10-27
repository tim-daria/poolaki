"""DjangoClient presents the internal bearer token on every backend request."""

import httpx
import pytest

from app.clients.django import DjangoClient
from app.config.settings import settings


@pytest.mark.asyncio
async def test_fetch_backend_data_sends_bearer_token():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"ok": True})

    client = DjangoClient(transport=httpx.MockTransport(handler))

    data = await client.fetch_backend_data(
        "/api/internal/v1/categories/", {"user_id": 1, "organization_id": 2}
    )
    await client.close()

    assert data == {"ok": True}
    assert seen[0].headers["Authorization"] == f"Bearer {settings.internal_api_token}"
