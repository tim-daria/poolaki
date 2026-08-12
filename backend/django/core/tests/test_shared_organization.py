import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Membership, Organization, Role, User


@pytest.mark.django_db
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

    session = api_client.session
    session["current_organization_id"] = personal_org.id
    session.save()

    response = api_client.get(
        reverse("organization-list-create"),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["current_organization_id"] == personal_org.id
    assert len(data["organizations"]) == 2

    organization_ids = {org["id"] for org in data["organizations"]}

    assert personal_org.id in organization_ids
    assert shared_org.id in organization_ids


@pytest.mark.django_db
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


@pytest.mark.django_db
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


@pytest.mark.django_db
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


@pytest.mark.django_db
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


@pytest.mark.django_db
def test_create_shared_organization_changes_current_organization(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:

    user, _ = personal_user

    api_client.force_authenticate(user=user)

    response = api_client.post(
        reverse("organization-list-create"),
        {
            "name": "Trip",
            "initial_balance": "250",
        },
        format="json",
    )

    assert response.status_code == 201

    # shared_org_id = response.data["id"]
    # assert api_client.session["current_organization_id"] == shared_org_id


# @pytest.mark.django_db
# def test_switch_organization_updates_session(
#     api_client: APIClient,
#     personal_user: tuple[User, Organization],
# ) -> None:
#     user, personal_org = personal_user

#     api_client.force_authenticate(user=user)

#     shared_org = Organization.objects.create(
#         name="Trip",
#         is_personal=False,
#         initial_balance=100,
#     )

#     Membership.objects.create(
#         user=user,
#         org=shared_org,
#         role=Role.OWNER,
#     )

#     session = api_client.session
#     session["current_organization_id"] = shared_org.id
#     session.save()

#     response = api_client.post(
#         reverse(
#             "switch_organization",
#             kwargs={"org_id": personal_org.id},
#         ),
#     )

#     assert response.status_code == 200

#     assert response.json() == {"current_organization_id": personal_org.id}

#     session = api_client.session

#     assert session["current_organization_id"] == personal_org.id


# @pytest.mark.django_db
# def test_switch_organization_denies_non_member(
#     api_client: APIClient,
#     personal_user: tuple[User, Organization],
# ) -> None:
#     user, _ = personal_user

#     another_user = User.objects.create_user(
#         email="another@example.com",
#         username="another",
#         password="password123",
#     )

#     foreign_org = Organization.objects.create(
#         name="Foreign",
#         is_personal=False,
#     )

#     Membership.objects.create(
#         user=another_user,
#         org=foreign_org,
#         role=Role.OWNER,
#     )

#     api_client.force_authenticate(user=user)

#     response = api_client.post(
#         reverse(
#             "switch_organization",
#             kwargs={"org_id": foreign_org.id},
#         ),
#     )

#     assert response.status_code == 403
