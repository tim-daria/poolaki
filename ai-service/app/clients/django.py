import logging
from typing import Any

import httpx
from pydantic import BaseModel, Field

from app.config.settings import settings

logger = logging.getLogger(__name__)


class RetrievalRequest(BaseModel):
    user_id: str
    organization_id: str
    question: str
    intent: str
    top_k: int = Field(default=5, ge=1)


class RetrievedItem(BaseModel):
    type: str
    content: str
    source: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class CombinedRetrievalResult(BaseModel):
    items: list[RetrievedItem] = Field(default_factory=list)


class MockDjangoClient:
    """TESTING ONLY: temporal client to simulate Django
    TODO: replace for the real integration
    """

    async def fetch_backend_data(self, endpoint: str, payload: dict) -> dict[str, Any]:
        if endpoint == "/api/internal/v1/analytics/monthly-summary":
            return {
                "period": "2026-01",
                "total_income": 2500,
                "total_expenses": 850,
                "categories": [
                    {
                        "name": "Food",
                        "amount": 300,
                    }
                ],
            }

        # if endpoint == "/api/internal/v1/transactions":
        # return {
        #    "transactions": [
        #        {"date": "2026-01-20", "description": "Groceries", "amount": 120},
        #        {"date": "2026-01-19", "description": "Restaurant", "amount": 45},
        #        {"date": "2026-01-18", "description": "Transport", "amount": 30},
        #    ]
        # }

        # if endpoint == "/api/internal/v1/goals/progress":
        #    return {
        #        "goal": "Emergency Fund",
        #        "target": 5000,
        #        "current": 3200,
        #        "progress_percentage": 64,
        #    }

        return {}


class DjangoClient:
    """Real HTTP client for the /api/internal/v1/ namespace; service token
    auth is not wired yet."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(base_url=settings.django_base_url)

    async def fetch_backend_data(
        self, endpoint: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        try:
            response = await self._client.post(endpoint, json=payload)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            # Degrade: the answer is still built from vector context
            logger.warning(
                "Django backend request failed",
                extra={
                    "endpoint": endpoint,
                    "status_code": (
                        exc.response.status_code
                        if isinstance(exc, httpx.HTTPStatusError)
                        else None
                    ),
                },
            )
            return {}

        return response.json()

    async def close(self) -> None:
        await self._client.aclose()
