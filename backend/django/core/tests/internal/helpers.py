"""Shared request helpers and URL names for the internal AI endpoint tests:
the body contract (user_id + organization_id) is identical for every
endpoint, so the builders live here once."""

from decimal import Decimal
from typing import Any

from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Category, Goal, Organization, Transaction, User

AI_ANALYTICS_URL = "ai-analytics-summary"
AI_CATEGORIES_URL = "ai-categories"
AI_TRANSACTIONS_URL = "ai-transactions"

# Must match INTERNAL_API_TOKEN in core/tests/conftest.py (the autouse
# fixture pins the setting to this value for every test).
VALID_TOKEN = "test-internal-token"


def add_transaction(
    org: Organization,
    entry_type: str,
    amount: str,
    transaction_date: str,
    category: Category | None = None,
    description: str | None = None,
    goal: Goal | None = None,
) -> Transaction:
    return Transaction.objects.create(
        org=org,
        entry_type=entry_type,
        amount=Decimal(amount),
        transaction_date=transaction_date,
        category=category,
        description=description,
        goal=goal,
    )


def post_endpoint(
    api_client: APIClient,
    url_name: str,
    body: dict[str, object],
    token: str | None = VALID_TOKEN,
) -> Any:
    """Raw POST to an internal AI endpoint with the valid bearer token by
    default; token=None omits the Authorization header (auth-matrix tests).
    Bodies may deviate from the standard member shape."""
    # The DRF stubs type the test response as the private `_MonkeyPatchedResponse`
    # (a `Response` subclass that adds `.json()`), so no public return type works.
    if token is None:
        return api_client.post(reverse(url_name), body, format="json")
    return api_client.post(
        reverse(url_name), body, format="json", HTTP_AUTHORIZATION=f"Bearer {token}"
    )


def post_ai_endpoint(
    api_client: APIClient,
    url_name: str,
    user: User,
    org: Organization,
    **extra: object,
) -> Any:
    """POST the standard member body (user_id + organization_id) plus extras."""
    return post_endpoint(
        api_client, url_name, {"user_id": user.id, "organization_id": org.id, **extra}
    )
