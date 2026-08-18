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


@pytest.fixture
def owner() -> User:
    return User.objects.create_user(
        email="owner@example.com", username="owner", password="pass1234"
    )


@pytest.fixture
def member() -> User:
    return User.objects.create_user(
        email="member@example.com", username="member", password="pass1234"
    )


@pytest.fixture
def invitee() -> User:
    """A registered user who will be invited."""
    return User.objects.create_user(
        email="invitee@example.com", username="invitee", password="pass1234"
    )


@pytest.fixture
def shared_org(owner: User, member: User) -> Organization:
    org = Organization.objects.create(
        name="Family budget", is_personal=False, initial_balance=Decimal("0")
    )
    Membership.objects.create(user=owner, org=org, role=Role.OWNER)
    Membership.objects.create(user=member, org=org, role=Role.MEMBER)
    return org


@pytest.fixture
def personal_org(owner: User) -> Organization:
    org = Organization.objects.create(
        name="owner's budget", is_personal=True, initial_balance=Decimal("0")
    )
    Membership.objects.create(user=owner, org=org, role=Role.OWNER)
    return org
