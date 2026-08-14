import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Membership, Organization, Role, User

pytestmark = pytest.mark.django_db


def test_get_user_organizations_returns_memberships(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, personal_org = personal_user

    shared_org = Organization.objects.create(
        name="Shared budget",
        is_personal=False,
    )

    Membership.objects.create(
        user=user,
        org=shared_org,
        role=Role.OWNER,
    )

    api_client.force_authenticate(user=user)

    # session = api_client.session
    # session["current_organization_id"] = personal_org.id
    # session.save()

    response = api_client.get(
        reverse("organization-list-create"),
    )

    assert response.status_code == 200

    data = response.json()

    # assert data["current_organization_id"] == personal_org.id
    assert len(data["organizations"]) == 2

    organization_ids = {org["id"] for org in data["organizations"]}

    assert personal_org.id in organization_ids
    assert shared_org.id in organization_ids


def test_get_user_organizations_does_not_return_foreign_organizations(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, _ = personal_user

    another_user = User.objects.create_user(
        email="another@example.com",
        username="another",
        password="password123",
    )

    foreign_org = Organization.objects.create(
        name="Foreign org",
        is_personal=False,
    )

    Membership.objects.create(
        user=another_user,
        org=foreign_org,
        role=Role.OWNER,
    )

    api_client.force_authenticate(user=user)

    response = api_client.get(
        reverse("organization-list-create"),
    )

    assert response.status_code == 200

    organization_ids = {org["id"] for org in response.json()["organizations"]}

    assert foreign_org.id not in organization_ids


def test_create_shared_organization(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, _ = personal_user

    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("organization-list-create"),
        {
            "name": "Holiday",
            "initial_balance": "500",
        },
        format="json",
    )

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "Holiday"
    assert data["initial_balance"] == "500.00"
    assert data["is_personal"] is False

    assert Organization.objects.filter(
        name="Holiday",
        is_personal=False,
    ).exists()


def test_create_shared_organization_requires_name(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, _ = personal_user

    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("organization-list-create"),
        {
            "initial_balance": "100",
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["error"] == "name is required"


def test_create_shared_organization_rejects_invalid_balance(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, _ = personal_user

    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("organization-list-create"),
        {
            "name": "Trip",
            "initial_balance": "invalid",
        },
        format="json",
    )

    assert response.status_code == 400


def test_organization_members_returns_members(
    api_client: APIClient,
    owner: User,
    member: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.get(reverse("organization-members", kwargs={"org_id": shared_org.id}))

    assert response.status_code == 200

    members = response.data["members"]

    assert len(members) == 2
    owner_data = next(m for m in members if m["user_id"] == owner.id)
    member_data = next(m for m in members if m["user_id"] == member.id)

    assert owner_data["username"] == owner.username
    assert owner_data["role"] == Role.OWNER

    assert member_data["username"] == member.username
    assert member_data["role"] == Role.MEMBER


def test_organization_member_can_view_members(
    api_client: APIClient,
    member: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=member)

    response = api_client.get(
        reverse(
            "organization-members",
            kwargs={"org_id": shared_org.id},
        )
    )

    assert response.status_code == 200


def test_user_from_another_organization_cannot_view_members(
    api_client: APIClient,
    owner: User,
    personal_user: tuple[User, Organization],
) -> None:
    _, org = personal_user
    api_client.force_authenticate(user=owner)

    response = api_client.get(
        reverse(
            "organization-members",
            kwargs={"org_id": org.id},
        )
    )

    assert response.status_code == 403
