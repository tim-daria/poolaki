from typing import Any


class DjangoClientError(Exception):
    """Api contract defined as: {"error": {"code", "message"}}."""

    def __init__(self, code: str, message: str, status_code: int):
        super().__init__(message)
        self.code = code  # FORBIDDEN, INVALID_REQUEST, INTERNAL_ERROR, ...
        self.status_code = status_code


def _months(income: list[str], expense: list[str]) -> list[dict[str, str | int]]:
    pad = ["0.00"] * (12 - len(income))
    return [
        {"month": i + 1, "income": inc, "expense": exp}
        for i, (inc, exp) in enumerate(zip(income + pad, expense + pad))
    ]


class MockDjangoClient:
    """TESTING ONLY: temporal client to simulate Django
    TODO: replace for the real integration
    """

    async def fetch_backend_data(self, endpoint: str, payload: dict) -> dict[str, Any]:
        if payload.get("user_id") == 0:  # simula un usuario fuera de la organización
            raise DjangoClientError(
                "FORBIDDEN", "User is not a member of the organization", 403
            )

        if endpoint == "/api/internal/v1/analytics/summary/":
            return {
                "year": 2026,
                "balance": "3500.00",
                "totals": {"income": "25000.00", "expense": "8500.00"},
                "months": _months(
                    income=["2500.00", "2200.00", "2200.00"],
                    expense=["850.00", "720.00", "900.00"],
                ),
            }

        if endpoint == "/api/internal/v1/categories/":
            return {
                "year": 2026,
                "categories": [
                    {
                        "category_id": 12,
                        "name": "Salary",
                        "type": "income",
                        "total": "6900.00",
                        "monthly": ["2500.00", "2200.00", "2200.00"] + ["0.00"] * 9,
                    },
                    {
                        "category_id": 4,
                        "name": "Food",
                        "type": "expense",
                        "total": "670.00",
                        "monthly": ["180.00", "190.00", "300.00"] + ["0.00"] * 9,
                    },
                ],
            }

        if endpoint == "/api/internal/v1/transactions/":
            return {
                "transactions": [
                    {
                        "id": 789,
                        "date": "2026-10-18",
                        "description": "Groceries",
                        "entry_type": "expense",
                        "category": "Food",
                        "goal": None,
                        "amount": "50.00",
                    },
                    {
                        "id": 788,
                        "date": "2026-10-15",
                        "description": None,
                        "entry_type": "income",
                        "category": "Salary",
                        "goal": None,
                        "amount": "2200.00",
                    },
                ]
            }

        return {}
