import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import (
    Invitation,
    InvitationStatus,
    Membership,
    Organization,
    Role,
    User,
)

pytestmark = pytest.mark.django_db

# ---------------------------------------------------------------------------
# GET — list pending invitations
# ---------------------------------------------------------------------------


class TestListInvitations:
    def test_owner_sees_only_pending_invitations(
        self, api_client: APIClient, owner: User, shared_org: Organization, invitee: User
    ) -> None:
        pending = Invitation.objects.create(
            org=shared_org, invited_user=invitee, invited_by=owner, status=InvitationStatus.PENDING
        )
        other_user = User.objects.create_user(
            email="x@example.com", username="x", password="pass1234"
        )
        Invitation.objects.create(
            org=shared_org,
            invited_user=other_user,
            invited_by=owner,
            status=InvitationStatus.DECLINED,
        )

        api_client.force_authenticate(user=owner)
        response = api_client.get(
            reverse("invitation-list-create", kwargs={"org_id": shared_org.id})
        )

        assert response.status_code == 200
        ids = [inv["id"] for inv in response.data["invitations"]]
        assert ids == [pending.id]

    def test_list_returns_empty_when_no_pending_invitations(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.get(
            reverse("invitation-list-create", kwargs={"org_id": shared_org.id})
        )

        assert response.status_code == 200
        assert response.data["invitations"] == []

    def test_non_owner_member_cannot_list_invitations(
        self, api_client: APIClient, member: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=member)
        response = api_client.get(
            reverse("invitation-list-create", kwargs={"org_id": shared_org.id})
        )

        assert response.status_code == 403

    def test_unauthenticated_user_cannot_list_invitations(
        self, api_client: APIClient, shared_org: Organization
    ) -> None:
        response = api_client.get(
            reverse("invitation-list-create", kwargs={"org_id": shared_org.id})
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST — create invitation
# ---------------------------------------------------------------------------


class TestCreateInvitation:
    def test_owner_can_invite_existing_user(
        self, api_client: APIClient, owner: User, shared_org: Organization, invitee: User
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse(
                "invitation-list-create",
                kwargs={"org_id": shared_org.id, "username": invitee.username},
            )
        )

        assert response.status_code == 201
        assert response.data["status"] == InvitationStatus.PENDING
        assert Invitation.objects.filter(org=shared_org, invited_user=invitee).exists()

    def test_non_owner_member_cannot_invite(
        self, api_client: APIClient, member: User, shared_org: Organization, invitee: User
    ) -> None:
        api_client.force_authenticate(user=member)
        response = api_client.post(
            reverse(
                "invitation-list-create",
                kwargs={"org_id": shared_org.id, "username": invitee.username},
            )
        )

        assert response.status_code == 403
        assert not Invitation.objects.filter(org=shared_org, invited_user=invitee).exists()

    def test_cannot_invite_to_personal_org(
        self, api_client: APIClient, owner: User, personal_org: Organization, invitee: User
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse(
                "invitation-list-create",
                kwargs={"org_id": personal_org.id, "username": invitee.username},
            )
        )

        assert response.status_code == 400
        assert not Invitation.objects.filter(org=personal_org).exists()

    def test_cannot_invite_nonexistent_username(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse(
                "invitation-list-create",
                kwargs={"org_id": shared_org.id, "username": "does_not_exist"},
            )
        )

        assert response.status_code == 400

    def test_cannot_invite_existing_member(
        self, api_client: APIClient, owner: User, shared_org: Organization, member: User
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse(
                "invitation-list-create",
                kwargs={"org_id": shared_org.id, "username": member.username},
            )
        )

        assert response.status_code == 400

    def test_cannot_invite_same_user_twice_while_pending(
        self, api_client: APIClient, owner: User, shared_org: Organization, invitee: User
    ) -> None:
        api_client.force_authenticate(user=owner)
        first = api_client.post(
            reverse(
                "invitation-list-create",
                kwargs={"org_id": shared_org.id, "username": invitee.username},
            )
        )
        second = api_client.post(
            reverse(
                "invitation-list-create",
                kwargs={"org_id": shared_org.id, "username": invitee.username},
            )
        )

        assert first.status_code == 201
        assert second.status_code == 400
        assert Invitation.objects.filter(org=shared_org, invited_user=invitee).count() == 1

    def test_cannot_invite_beyond_max_members(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        # shared_org already has owner + member = 2. Fill up to the limit of 5.
        for i in range(3):
            u = User.objects.create_user(
                email=f"extra{i}@example.com", username=f"extra{i}", password="pass1234"
            )
            Membership.objects.create(user=u, org=shared_org, role=Role.MEMBER)

        one_too_many = User.objects.create_user(
            email="last@example.com", username="last", password="pass1234"
        )

        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse(
                "invitation-list-create",
                kwargs={"org_id": shared_org.id, "username": one_too_many.username},
            )
        )
        assert response.status_code == 400

    def test_missing_username_returns_400(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse("invitation-list-create", kwargs={"org_id": shared_org.id})
        )

        assert response.status_code == 400


# ---------------------------------------------------------------------------
# POST — cancel invitation
# ---------------------------------------------------------------------------


class TestCancelInvitation:
    def test_owner_can_cancel_pending_invitation(
        self, api_client: APIClient, owner: User, shared_org: Organization, invitee: User
    ) -> None:
        invitation = Invitation.objects.create(
            org=shared_org, invited_user=invitee, invited_by=owner, status=InvitationStatus.PENDING
        )

        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse(
                "invitation-cancel",
                kwargs={"org_id": shared_org.id, "invitation_id": invitation.id},
            )
        )

        assert response.status_code == 200
        invitation.refresh_from_db()
        assert invitation.status == InvitationStatus.CANCELLED

    def test_cannot_cancel_already_accepted_invitation(
        self, api_client: APIClient, owner: User, shared_org: Organization, invitee: User
    ) -> None:
        invitation = Invitation.objects.create(
            org=shared_org, invited_user=invitee, invited_by=owner, status=InvitationStatus.ACCEPTED
        )

        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse(
                "invitation-cancel",
                kwargs={"org_id": shared_org.id, "invitation_id": invitation.id},
            )
        )

        assert response.status_code == 400
        invitation.refresh_from_db()
        assert invitation.status == InvitationStatus.ACCEPTED

    def test_cannot_cancel_nonexistent_invitation(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(
            reverse("invitation-cancel", kwargs={"org_id": shared_org.id, "invitation_id": 999999})
        )

        assert response.status_code == 400

    def test_non_owner_member_cannot_cancel_invitation(
        self,
        api_client: APIClient,
        owner: User,
        member: User,
        shared_org: Organization,
        invitee: User,
    ) -> None:
        invitation = Invitation.objects.create(
            org=shared_org, invited_user=invitee, invited_by=owner, status=InvitationStatus.PENDING
        )

        api_client.force_authenticate(user=member)
        response = api_client.post(
            reverse(
                "invitation-cancel",
                kwargs={"org_id": shared_org.id, "invitation_id": invitation.id},
            )
        )

        assert response.status_code == 403
        invitation.refresh_from_db()
        assert invitation.status == InvitationStatus.PENDING
