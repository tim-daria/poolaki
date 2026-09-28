from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import (
    Invitation,
    InvitationStatus,
    Membership,
    Notification,
    NotificationType,
    Organization,
    Role,
    User,
)
from core.services.organization import MAX_ORGS_PER_USER

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

    response = api_client.get(
        reverse("organization-list-create"),
    )

    assert response.status_code == 200

    data = response.json()
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

    # missing, empty, and whitespace-only names all fail the shared name contract
    for body in (
        {"initial_balance": "100"},
        {"name": "", "initial_balance": "100"},
        {"name": "   ", "initial_balance": "100"},
    ):
        response = api_client.post(
            reverse("organization-list-create"),
            body,
            format="json",
        )
        assert response.status_code == 400
        assert "name" in response.json()


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


# ---------------------------------------------------------------------------
# DELETE - remove member
# ---------------------------------------------------------------------------


def test_owner_can_remove_member(
    api_client: APIClient,
    owner: User,
    member: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.delete(
        reverse(
            "organization-remove-member",
            kwargs={"org_id": shared_org.id, "user_id": member.id},
        )
    )

    assert response.status_code == 204

    assert not Membership.objects.filter(user=member, org=shared_org).exists()

    removed_notification = Notification.objects.filter(
        user=member, type=NotificationType.REMOVED_FROM_ORG
    ).get()
    assert removed_notification.payload == {
        "org_name": shared_org.name,
        "removed_by": owner.username,
    }

    remaining_notifications = Notification.objects.filter(
        user=owner, org=shared_org, type=NotificationType.MEMBER_REMOVED
    )
    assert remaining_notifications.count() == 1
    assert remaining_notifications.get().payload == {
        "org_name": shared_org.name,
        "removed_user": member.username,
        "removed_by": owner.username,
    }


def test_remove_member_notifies_all_remaining_members(
    api_client: APIClient,
    owner: User,
    member: User,
    shared_org: Organization,
) -> None:
    extra_member = User.objects.create_user(
        email="extra@example.com", username="extra", password="pass1234"
    )
    Membership.objects.create(user=extra_member, org=shared_org, role=Role.MEMBER)

    api_client.force_authenticate(user=owner)

    response = api_client.delete(
        reverse(
            "organization-remove-member",
            kwargs={"org_id": shared_org.id, "user_id": member.id},
        )
    )

    assert response.status_code == 204

    # Notified: owner + extra_member, but not the removed member
    notified = Notification.objects.filter(type=NotificationType.MEMBER_REMOVED)
    assert notified.count() == 2
    assert set(notified.values_list("user_id", flat=True)) == {owner.id, extra_member.id}
    assert not notified.filter(user=member).exists()


def test_owner_cannot_remove_themselves(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.delete(
        reverse(
            "organization-remove-member",
            kwargs={"org_id": shared_org.id, "user_id": owner.id},
        )
    )

    assert response.status_code == 400
    assert "Use leave organization to remove yourself." in response.json()["errors"]

    assert Membership.objects.filter(user=owner, org=shared_org).exists()


def test_cannot_remove_user_who_is_not_a_member(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    stranger = User.objects.create_user(
        email="stranger@example.com", username="stranger", password="pass1234"
    )

    api_client.force_authenticate(user=owner)

    response = api_client.delete(
        reverse(
            "organization-remove-member",
            kwargs={"org_id": shared_org.id, "user_id": stranger.id},
        )
    )

    assert response.status_code == 400
    assert "This user is not a member of the organization." in response.json()["errors"]


def test_cannot_remove_unknown_user_id(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.delete(
        reverse(
            "organization-remove-member",
            kwargs={"org_id": shared_org.id, "user_id": 999999},
        )
    )

    assert response.status_code == 400
    assert "This user is not a member of the organization." in response.json()["errors"]


def test_non_owner_member_cannot_remove_members(
    api_client: APIClient,
    owner: User,
    member: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=member)

    response = api_client.delete(
        reverse(
            "organization-remove-member",
            kwargs={"org_id": shared_org.id, "user_id": owner.id},
        )
    )

    assert response.status_code == 403
    assert Membership.objects.filter(user=owner, org=shared_org).exists()


def test_stranger_cannot_remove_members(
    api_client: APIClient,
    owner: User,
    member: User,
    shared_org: Organization,
) -> None:
    stranger = User.objects.create_user(
        email="stranger@example.com", username="stranger", password="pass1234"
    )

    api_client.force_authenticate(user=stranger)

    response = api_client.delete(
        reverse(
            "organization-remove-member",
            kwargs={"org_id": shared_org.id, "user_id": member.id},
        )
    )

    assert response.status_code == 403
    assert Membership.objects.filter(user=member, org=shared_org).exists()


# ---------------------------------------------------------------------------
# POST - leave organization
# ---------------------------------------------------------------------------


def test_member_can_leave_organization(
    api_client: APIClient,
    owner: User,
    member: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=member)

    response = api_client.post(reverse("organization-leave", kwargs={"org_id": shared_org.id}))

    assert response.status_code == 200
    assert response.json() == {"organization_deleted": False}

    assert not Membership.objects.filter(user=member, org=shared_org).exists()
    # the staying member is notified; a plain member leaves trigger no transfer
    member_left = Notification.objects.filter(
        user=owner, org=shared_org, type=NotificationType.MEMBER_LEFT
    )
    assert member_left.count() == 1
    assert member_left.get().payload == {
        "user": member.username,
        "org_name": shared_org.name,
    }
    assert not Notification.objects.filter(type=NotificationType.OWNERSHIP_TRANSFERRED).exists()


def test_owner_leaving_transfers_ownership_to_longest_standing_member(
    api_client: APIClient,
    owner: User,
    member: User,
    shared_org: Organization,
) -> None:
    extra_member = User.objects.create_user(
        email="extra@example.com", username="extra", password="pass1234"
    )
    Membership.objects.create(user=extra_member, org=shared_org, role=Role.MEMBER)

    api_client.force_authenticate(user=owner)

    response = api_client.post(reverse("organization-leave", kwargs={"org_id": shared_org.id}))

    assert response.status_code == 200
    assert response.json() == {"organization_deleted": False}

    assert not Membership.objects.filter(user=owner, org=shared_org).exists()
    assert Membership.objects.get(user=member, org=shared_org).role == Role.OWNER
    assert Membership.objects.get(user=extra_member, org=shared_org).role == Role.MEMBER

    transfer_notification = Notification.objects.get(
        user=member, type=NotificationType.OWNERSHIP_TRANSFERRED
    )
    assert transfer_notification.payload == {
        "previous_owner": owner.username,
        "org_name": shared_org.name,
    }

    # the other member is informed, the new owner is not (they got the personal one)
    owner_changed = Notification.objects.filter(type=NotificationType.OWNER_CHANGED)
    assert owner_changed.count() == 1
    changed = owner_changed.get()
    assert changed.user_id == extra_member.id
    assert changed.payload == {
        "previous_owner": owner.username,
        "new_owner": member.username,
        "org_name": shared_org.name,
    }

    member_left = Notification.objects.filter(type=NotificationType.MEMBER_LEFT, org=shared_org)
    assert set(member_left.values_list("user_id", flat=True)) == {member.id, extra_member.id}


def test_owner_leaving_ownership_tie_breaks_by_user_id(
    api_client: APIClient,
    owner: User,
    member: User,
    shared_org: Organization,
) -> None:
    extra_member = User.objects.create_user(
        email="extra@example.com", username="extra", password="pass1234"
    )
    member_join = Membership.objects.get(user=member, org=shared_org)
    Membership.objects.create(user=extra_member, org=shared_org, role=Role.MEMBER)

    # make both members join at the same instant: the lower user id must win
    Membership.objects.filter(org=shared_org).exclude(user=owner).update(
        joined_at=member_join.joined_at
    )

    api_client.force_authenticate(user=owner)

    response = api_client.post(reverse("organization-leave", kwargs={"org_id": shared_org.id}))

    assert response.status_code == 200
    assert Membership.objects.get(user=member, org=shared_org).role == Role.OWNER
    assert Membership.objects.get(user=extra_member, org=shared_org).role == Role.MEMBER


def test_last_member_leaving_deletes_organization(
    api_client: APIClient,
    owner: User,
) -> None:
    org = Organization.objects.create(
        name="Solo org", is_personal=False, initial_balance=Decimal("0")
    )
    Membership.objects.create(user=owner, org=org, role=Role.OWNER)
    org_id = org.id

    api_client.force_authenticate(user=owner)

    response = api_client.post(reverse("organization-leave", kwargs={"org_id": org_id}))

    assert response.status_code == 200
    assert response.json() == {"organization_deleted": True}
    assert not Organization.objects.filter(id=org_id).exists()


def test_last_member_leaving_notifies_pending_invitation_recipients(
    api_client: APIClient,
    owner: User,
    invitee: User,
) -> None:
    org = Organization.objects.create(
        name="Solo org", is_personal=False, initial_balance=Decimal("0")
    )
    Membership.objects.create(user=owner, org=org, role=Role.OWNER)
    invitation = Invitation.objects.create(
        org=org, invited_user=invitee, invited_by=owner, status=InvitationStatus.PENDING
    )
    org_id = org.id

    api_client.force_authenticate(user=owner)

    response = api_client.post(reverse("organization-leave", kwargs={"org_id": org_id}))

    assert response.status_code == 200
    assert response.json() == {"organization_deleted": True}
    assert not Organization.objects.filter(id=org_id).exists()

    # the invitation is deleted with the org; the invitee is told about the deletion
    assert not Invitation.objects.filter(id=invitation.id).exists()
    deleted = Notification.objects.get(user=invitee, type=NotificationType.ORGANIZATION_DELETED)
    assert deleted.payload == {"org_name": "Solo org", "last_member": owner.username}
    assert deleted.org is None


def test_cannot_leave_personal_budget(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, personal_org = personal_user

    api_client.force_authenticate(user=user)

    response = api_client.post(reverse("organization-leave", kwargs={"org_id": personal_org.id}))

    assert response.status_code == 400
    assert "Can not leave your personal budget." in response.json()["errors"]
    assert Membership.objects.filter(user=user, org=personal_org).exists()


def test_non_member_cannot_leave_organization(
    api_client: APIClient,
    shared_org: Organization,
    stranger: User,
) -> None:
    api_client.force_authenticate(user=stranger)

    response = api_client.post(reverse("organization-leave", kwargs={"org_id": shared_org.id}))

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Per-user organization cap (MAX_ORGS_PER_USER)
# ---------------------------------------------------------------------------


def _give_orgs(user: User, count: int) -> None:
    """Create shared orgs with user as owner via ORM; cap checks must be bypassed in fixtures."""
    for i in range(count):
        org = Organization.objects.create(
            name=f"Cap org {i}", is_personal=False, initial_balance=Decimal("0")
        )
        Membership.objects.create(user=user, org=org, role=Role.OWNER)


def test_cannot_create_organization_at_per_user_cap(
    api_client: APIClient,
    owner: User,
) -> None:
    _give_orgs(owner, MAX_ORGS_PER_USER)

    api_client.force_authenticate(user=owner)

    response = api_client.post(
        reverse("organization-list-create"),
        {"name": "One too many", "initial_balance": "10"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["errors"] == [
        f"You can have a maximum of {MAX_ORGS_PER_USER} workspaces."
    ]
    assert not Organization.objects.filter(name="One too many").exists()
    assert Membership.objects.filter(user=owner).count() == MAX_ORGS_PER_USER


def test_can_create_organization_at_one_below_per_user_cap(
    api_client: APIClient,
    owner: User,
) -> None:
    """Boundary: with MAX_ORGS_PER_USER - 1 orgs the MAX_ORGS_PER_USER-th must be allowed."""
    _give_orgs(owner, MAX_ORGS_PER_USER - 1)

    api_client.force_authenticate(user=owner)

    response = api_client.post(
        reverse("organization-list-create"),
        {"name": "The tenth", "initial_balance": "10"},
        format="json",
    )

    assert response.status_code == 201
    assert Membership.objects.filter(user=owner).count() == MAX_ORGS_PER_USER


# ---------------------------------------------------------------------------
# PATCH - rename organization
# ---------------------------------------------------------------------------


def test_owner_can_rename_organization(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        reverse("organization-update", kwargs={"org_id": shared_org.id}),
        {"name": "Winter fund"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json() == {"id": shared_org.id, "name": "Winter fund"}

    shared_org.refresh_from_db()
    assert shared_org.name == "Winter fund"


def test_rename_is_idempotent_when_name_unchanged(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        reverse("organization-update", kwargs={"org_id": shared_org.id}),
        {"name": shared_org.name},
        format="json",
    )

    assert response.status_code == 200
    shared_org.refresh_from_db()
    assert shared_org.name == response.json()["name"]


def test_rename_trims_whitespace(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        reverse("organization-update", kwargs={"org_id": shared_org.id}),
        {"name": "   Padded name   "},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Padded name"


def test_member_cannot_rename_organization(
    api_client: APIClient,
    member: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=member)

    response = api_client.patch(
        reverse("organization-update", kwargs={"org_id": shared_org.id}),
        {"name": "Hijacked"},
        format="json",
    )

    assert response.status_code == 403
    shared_org.refresh_from_db()
    assert shared_org.name != "Hijacked"


def test_cannot_rename_personal_budget(
    api_client: APIClient,
    personal_org: Organization,
    owner: User,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        reverse("organization-update", kwargs={"org_id": personal_org.id}),
        {"name": "My custom budget"},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["errors"] == ["The name of your personal budget cannot be changed."]
    personal_org.refresh_from_db()
    assert personal_org.name != "My custom budget"


def test_rename_with_empty_name_rejected(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    # whitespace-only body passes as a string but must trim to empty and fail
    api_client.force_authenticate(user=owner)

    for body in ({"name": ""}, {"name": "    "}, {}):
        response = api_client.patch(
            reverse("organization-update", kwargs={"org_id": shared_org.id}),
            body,
            format="json",
        )
        assert response.status_code == 400

    shared_org.refresh_from_db()
    assert shared_org.name == "Family budget"


def test_rename_longer_than_100_chars_rejected(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        reverse("organization-update", kwargs={"org_id": shared_org.id}),
        {"name": "x" * 101},
        format="json",
    )

    assert response.status_code == 400
    shared_org.refresh_from_db()
    assert shared_org.name == "Family budget"
