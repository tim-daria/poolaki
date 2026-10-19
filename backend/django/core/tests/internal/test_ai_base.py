import pytest
from rest_framework.test import APIClient

from core.models import Organization, User
from core.tests.internal.helpers import (
    AI_ANALYTICS_URL,
    AI_CATEGORIES_URL,
    AI_TRANSACTIONS_URL,
    post_endpoint,
)

pytestmark = pytest.mark.django_db

UNKNOWN_ORG_ID = 99999999

# (test id, url name): every internal AI endpoint shares the same body contract
ENDPOINTS = [
    ("summary", AI_ANALYTICS_URL),
    ("categories", AI_CATEGORIES_URL),
    ("transactions", AI_TRANSACTIONS_URL),
]

URL_NAMES = [url for _, url in ENDPOINTS]
ENDPOINT_IDS = [name for name, _ in ENDPOINTS]


@pytest.mark.parametrize("url_name", URL_NAMES, ids=ENDPOINT_IDS)
def test_member_user_is_allowed(
    url_name: str, api_client: APIClient, shared_org: Organization, member: User
) -> None:
    response = post_endpoint(
        api_client, url_name, {"user_id": member.id, "organization_id": shared_org.id}
    )
    assert response.status_code == 200


@pytest.mark.parametrize("url_name", URL_NAMES, ids=ENDPOINT_IDS)
def test_non_member_user_is_forbidden(
    url_name: str, api_client: APIClient, shared_org: Organization, stranger: User
) -> None:
    response = post_endpoint(
        api_client, url_name, {"user_id": stranger.id, "organization_id": shared_org.id}
    )
    assert response.status_code == 403


@pytest.mark.parametrize("url_name", URL_NAMES, ids=ENDPOINT_IDS)
def test_unknown_org_returns_404(url_name: str, api_client: APIClient, member: User) -> None:
    response = post_endpoint(
        api_client, url_name, {"user_id": member.id, "organization_id": UNKNOWN_ORG_ID}
    )
    assert response.status_code == 404


@pytest.mark.parametrize("url_name", URL_NAMES, ids=ENDPOINT_IDS)
def test_missing_user_id_returns_400(
    url_name: str, api_client: APIClient, shared_org: Organization
) -> None:
    response = post_endpoint(api_client, url_name, {"organization_id": shared_org.id})
    assert response.status_code == 400


@pytest.mark.parametrize("url_name", URL_NAMES, ids=ENDPOINT_IDS)
def test_missing_organization_id_returns_400(
    url_name: str, api_client: APIClient, member: User
) -> None:
    response = post_endpoint(api_client, url_name, {"user_id": member.id})
    assert response.status_code == 400


@pytest.mark.parametrize("url_name", URL_NAMES, ids=ENDPOINT_IDS)
def test_year_out_of_range_returns_400(
    url_name: str, api_client: APIClient, shared_org: Organization, member: User
) -> None:
    # the shared AiQuerySerializer validates year on every endpoint, even
    # transactions where the value is accepted but unused
    for year in (1899, 2101):
        response = post_endpoint(
            api_client,
            url_name,
            {"user_id": member.id, "organization_id": shared_org.id, "year": year},
        )
        assert response.status_code == 400
