"""Auth matrix for the bearer-token gate on /api/internal/v1/: the valid
token is attached by the helpers by default, so every other test in this
directory exercises the authenticated path; these cover the rejected ones."""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Organization, User
from core.tests.internal.helpers import (
    AI_ANALYTICS_URL,
    AI_CATEGORIES_URL,
    AI_TRANSACTIONS_URL,
    post_endpoint,
)

pytestmark = pytest.mark.django_db

# (test id, url name): every internal AI endpoint shares the same gate
ENDPOINTS = [
    ("summary", AI_ANALYTICS_URL),
    ("categories", AI_CATEGORIES_URL),
    ("transactions", AI_TRANSACTIONS_URL),
]

URL_NAMES = [url for _, url in ENDPOINTS]
ENDPOINT_IDS = [name for name, _ in ENDPOINTS]


@pytest.mark.parametrize("url_name", URL_NAMES, ids=ENDPOINT_IDS)
def test_missing_token_returns_401(
    url_name: str, api_client: APIClient, shared_org: Organization, member: User
) -> None:
    response = post_endpoint(
        api_client,
        url_name,
        {"user_id": member.id, "organization_id": shared_org.id},
        token=None,
    )
    assert response.status_code == 401


@pytest.mark.parametrize("url_name", URL_NAMES, ids=ENDPOINT_IDS)
def test_invalid_token_returns_401(
    url_name: str, api_client: APIClient, shared_org: Organization, member: User
) -> None:
    response = post_endpoint(
        api_client,
        url_name,
        {"user_id": member.id, "organization_id": shared_org.id},
        token="not-the-service-token",
    )
    assert response.status_code == 401


def test_malformed_authorization_scheme_returns_401(
    api_client: APIClient, shared_org: Organization, member: User
) -> None:
    response = api_client.post(
        reverse(AI_ANALYTICS_URL),
        {"user_id": member.id, "organization_id": shared_org.id},
        format="json",
        HTTP_AUTHORIZATION="Basic abc",
    )
    assert response.status_code == 401
