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

pytestmark = pytest.mark.django_db


def invitations_url(org_id: int) -> str:
    return reverse("invitation-list-create", kwargs={"org_id": org_id})


def cancel_url(org_id: int, invitation_id: int) -> str:
    return reverse("invitation-cancel", kwargs={"org_id": org_id, "invitation_id": invitation_id})


def accept_url(invitation_id: int) -> str:
    return reverse("invitation-accept", kwargs={"invitation_id": invitation_id})


def decline_url(invitation_id: int) -> str:
    return reverse("invitation-decline", kwargs={"invitation_id": invitation_id})


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
        response = api_client.get(invitations_url(shared_org.id))

        assert response.status_code == 200
        ids = [inv["id"] for inv in response.data["invitations"]]
        assert ids == [pending.id]

    def test_list_returns_empty_when_no_pending_invitations(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.get(invitations_url(shared_org.id))

        assert response.status_code == 200
        assert response.data["invitations"] == []

    def test_non_owner_member_cannot_list_invitations(
        self, api_client: APIClient, member: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=member)
        response = api_client.get(invitations_url(shared_org.id))

        assert response.status_code == 403

    def test_unauthenticated_user_cannot_list_invitations(
        self, api_client: APIClient, shared_org: Organization
    ) -> None:
        response = api_client.get(invitations_url(shared_org.id))

        assert response.status_code == 403


# ---------------------------------------------------------------------------
# POST — create invitation
# ---------------------------------------------------------------------------


class TestCreateInvitation:
    def test_owner_can_invite_existing_user(
        self, api_client: APIClient, owner: User, shared_org: Organization, invitee: User
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(invitations_url(shared_org.id), {"username": invitee.username})

        assert response.status_code == 201
        assert response.data["status"] == InvitationStatus.PENDING
        assert Invitation.objects.filter(org=shared_org, invited_user=invitee).exists()

    def test_non_owner_member_cannot_invite(
        self, api_client: APIClient, member: User, shared_org: Organization, invitee: User
    ) -> None:
        api_client.force_authenticate(user=member)
        response = api_client.post(invitations_url(shared_org.id), {"username": invitee.username})

        assert response.status_code == 403
        assert not Invitation.objects.filter(org=shared_org, invited_user=invitee).exists()

    def test_cannot_invite_to_personal_org(
        self, api_client: APIClient, owner: User, personal_org: Organization, invitee: User
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(invitations_url(personal_org.id), {"username": invitee.username})

        assert response.status_code == 400
        assert not Invitation.objects.filter(org=personal_org).exists()

    def test_cannot_invite_nonexistent_username(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(invitations_url(shared_org.id), {"username": "does_not_exist"})

        assert response.status_code == 400

    def test_cannot_invite_existing_member(
        self, api_client: APIClient, owner: User, shared_org: Organization, member: User
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(invitations_url(shared_org.id), {"username": member.username})

        assert response.status_code == 400

    def test_cannot_invite_same_user_twice_while_pending(
        self, api_client: APIClient, owner: User, shared_org: Organization, invitee: User
    ) -> None:
        api_client.force_authenticate(user=owner)
        first = api_client.post(invitations_url(shared_org.id), {"username": invitee.username})
        second = api_client.post(invitations_url(shared_org.id), {"username": invitee.username})

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
            invitations_url(shared_org.id), {"username": one_too_many.username}
        )

        assert response.status_code == 400

    def test_cannot_invite_when_pending_invitations_fill_member_limit(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        # shared_org has owner + member = 2. Add one more member -> 3 members total.
        u = User.objects.create_user(
            email="extra@example.com", username="extra", password="pass1234"
        )
        Membership.objects.create(user=u, org=shared_org, role=Role.MEMBER)

        # Create 2 pending invitations.
        for i in range(2):
            invited_user = User.objects.create_user(
                email=f"invited{i}@example.com", username=f"invited{i}", password="pass1234"
            )
            Invitation.objects.create(
                org=shared_org,
                invited_user=invited_user,
                invited_by=owner,
                status=InvitationStatus.PENDING,
            )

        # 3 members + 2 pending invitations = 5.
        one_too_many = User.objects.create_user(
            email="last@example.com", username="last", password="pass1234"
        )

        api_client.force_authenticate(user=owner)
        response = api_client.post(
            invitations_url(shared_org.id), {"username": one_too_many.username}
        )

        assert response.status_code == 400

    def test_missing_username_returns_400(
        self, api_client: APIClient, owner: User, shared_org: Organization
    ) -> None:
        api_client.force_authenticate(user=owner)
        response = api_client.post(invitations_url(shared_org.id))

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


# ---------------------------------------------------------------------------
# GET /invitations/mine/
# ---------------------------------------------------------------------------


class TestMyInvitations:
    def test_lists_own_pending_invitations(
        self,
        api_client: APIClient,
        invitee: User,
        pending_invitation: Invitation,
        shared_org: Organization,
    ) -> None:
        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("my-invitations"))

        assert response.status_code == 200
        ids = [inv["id"] for inv in response.data["invitations"]]
        assert ids == [pending_invitation.id]
        assert response.data["invitations"][0]["organization_name"] == shared_org.name

    def test_does_not_list_other_users_invitations(
        self, api_client: APIClient, stranger: User, pending_invitation: Invitation
    ) -> None:
        api_client.force_authenticate(user=stranger)
        response = api_client.get(reverse("my-invitations"))

        assert response.status_code == 200
        assert response.data["invitations"] == []

    def test_does_not_list_non_pending_invitations(
        self, api_client: APIClient, invitee: User, pending_invitation: Invitation
    ) -> None:
        pending_invitation.status = InvitationStatus.DECLINED
        pending_invitation.save(update_fields=["status"])

        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("my-invitations"))

        assert response.status_code == 200
        assert response.data["invitations"] == []

    def test_unauthenticated_cannot_list(self, api_client: APIClient) -> None:
        response = api_client.get(reverse("my-invitations"))
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# POST /invitations/{id}/accept/
# ---------------------------------------------------------------------------


class TestAcceptInvitation:
    def test_invitee_can_accept(
        self,
        api_client: APIClient,
        invitee: User,
        pending_invitation: Invitation,
        shared_org: Organization,
    ) -> None:
        api_client.force_authenticate(user=invitee)
        response = api_client.post(accept_url(pending_invitation.id))

        assert response.status_code == 200
        assert response.data["organization_id"] == shared_org.id
        assert Membership.objects.filter(user=invitee, org=shared_org, role=Role.MEMBER).exists()

        pending_invitation.refresh_from_db()
        assert pending_invitation.status == InvitationStatus.ACCEPTED
        assert pending_invitation.responded_at is not None

    def test_accepting_marks_notification_read(
        self, api_client: APIClient, invitee: User, pending_invitation: Invitation
    ) -> None:
        api_client.force_authenticate(user=invitee)
        api_client.post(accept_url(pending_invitation.id))

        notification = Notification.objects.get(
            user=invitee,
            type=NotificationType.INVITATION,
            payload__invitation_id=pending_invitation.id,
        )
        assert notification.is_read is True

    def test_someone_else_cannot_accept(
        self, api_client: APIClient, stranger: User, pending_invitation: Invitation
    ) -> None:
        api_client.force_authenticate(user=stranger)
        response = api_client.post(accept_url(pending_invitation.id))

        assert response.status_code == 403
        pending_invitation.refresh_from_db()
        assert pending_invitation.status == InvitationStatus.PENDING

    def test_cannot_accept_already_declined_invitation(
        self, api_client: APIClient, invitee: User, pending_invitation: Invitation
    ) -> None:
        pending_invitation.status = InvitationStatus.DECLINED
        pending_invitation.save(update_fields=["status"])

        api_client.force_authenticate(user=invitee)
        response = api_client.post(accept_url(pending_invitation.id))

        assert response.status_code == 400

    def test_cannot_accept_when_org_is_full(
        self,
        api_client: APIClient,
        invitee: User,
        pending_invitation: Invitation,
        shared_org: Organization,
    ) -> None:
        # Fill the org up to the max while the invitation is still pending.
        for i in range(4):
            u = User.objects.create_user(
                email=f"extra{i}@example.com", username=f"extra{i}", password="pass1234"
            )
            Membership.objects.create(user=u, org=shared_org, role=Role.MEMBER)

        api_client.force_authenticate(user=invitee)
        response = api_client.post(accept_url(pending_invitation.id))

        assert response.status_code == 400
        assert not Membership.objects.filter(user=invitee, org=shared_org).exists()

    def test_accept_nonexistent_invitation_returns_404(
        self, api_client: APIClient, invitee: User
    ) -> None:
        api_client.force_authenticate(user=invitee)
        response = api_client.post(accept_url(999999))
        assert response.status_code == 404

    def test_unauthenticated_cannot_accept(
        self, api_client: APIClient, pending_invitation: Invitation
    ) -> None:
        response = api_client.post(accept_url(pending_invitation.id))
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# POST /invitations/{id}/decline/
# ---------------------------------------------------------------------------


class TestDeclineInvitation:
    def test_invitee_can_decline(
        self,
        api_client: APIClient,
        invitee: User,
        pending_invitation: Invitation,
        shared_org: Organization,
    ) -> None:
        api_client.force_authenticate(user=invitee)
        response = api_client.post(decline_url(pending_invitation.id))

        assert response.status_code == 200
        assert response.data["status"] == InvitationStatus.DECLINED
        assert not Membership.objects.filter(user=invitee, org=shared_org).exists()

        pending_invitation.refresh_from_db()
        assert pending_invitation.status == InvitationStatus.DECLINED
        assert pending_invitation.responded_at is not None

    def test_declining_marks_notification_read(
        self, api_client: APIClient, invitee: User, pending_invitation: Invitation
    ) -> None:
        api_client.force_authenticate(user=invitee)
        api_client.post(decline_url(pending_invitation.id))

        notification = Notification.objects.get(
            user=invitee,
            type=NotificationType.INVITATION,
            payload__invitation_id=pending_invitation.id,
        )
        assert notification.is_read is True

    def test_someone_else_cannot_decline(
        self, api_client: APIClient, stranger: User, pending_invitation: Invitation
    ) -> None:
        api_client.force_authenticate(user=stranger)
        response = api_client.post(decline_url(pending_invitation.id))

        assert response.status_code == 403
        pending_invitation.refresh_from_db()
        assert pending_invitation.status == InvitationStatus.PENDING

    def test_cannot_decline_already_accepted_invitation(
        self, api_client: APIClient, invitee: User, pending_invitation: Invitation
    ) -> None:
        pending_invitation.status = InvitationStatus.ACCEPTED
        pending_invitation.save(update_fields=["status"])

        api_client.force_authenticate(user=invitee)
        response = api_client.post(decline_url(pending_invitation.id))

        assert response.status_code == 400

    def test_decline_nonexistent_invitation_returns_404(
        self, api_client: APIClient, invitee: User
    ) -> None:
        api_client.force_authenticate(user=invitee)
        response = api_client.post(decline_url(999999))
        assert response.status_code == 404
