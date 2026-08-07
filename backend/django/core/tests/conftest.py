from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from core.models import Membership, Organization, Role, User


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def personal_user() -> tuple[User, Organization]:
    user = User.objects.create_user(
        email="test@example.com",
        username="test",
        password="pass1234",
    )
    org = Organization.objects.create(
        name="Personal budget",
        is_personal=True,
        initial_balance=Decimal("0"),
    )
    Membership.objects.create(
        user=user,
        org=org,
        role=Role.OWNER,
    )
    return user, org
