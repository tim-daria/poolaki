from typing import Any

from pydantic import BaseModel, Field


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
