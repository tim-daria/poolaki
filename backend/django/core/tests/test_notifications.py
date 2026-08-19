from datetime import UTC, datetime, timedelta

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Invitation, Notification, NotificationType, User

pytestmark = pytest.mark.django_db


def make_notification(
    user: User,
    *,
    ntype: str = NotificationType.TRANSACTION_ADDED,
    payload: dict[str, object] | None = None,
    is_read: bool = False,
) -> Notification:
    return Notification.objects.create(
        user=user,
        type=ntype,
        payload=payload if payload is not None else {},
        is_read=is_read,
    )


def set_created_at(notification: Notification, created_at: datetime) -> None:
    """Bypass auto_now_add so tests can control the ordering field."""
    Notification.objects.filter(pk=notification.pk).update(created_at=created_at)


# ---------------------------------------------------------------------------
# GET /notifications/unread-count/
# ---------------------------------------------------------------------------


class TestUnreadNotificationCount:
    def test_returns_only_own_unread_notifications(
        self, api_client: APIClient, invitee: User, stranger: User
    ) -> None:
        make_notification(invitee, is_read=False)
        make_notification(invitee, is_read=False, ntype=NotificationType.GOAL_COMPLETED)
        make_notification(invitee, is_read=True)
        make_notification(stranger, is_read=False)
        make_notification(stranger, is_read=False)

        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-unread-count"))

        assert response.status_code == 200
        assert response.data == {"unread_count": 2}

    def test_returns_zero_without_any_notifications(
        self, api_client: APIClient, stranger: User
    ) -> None:
        api_client.force_authenticate(user=stranger)
        response = api_client.get(reverse("notification-unread-count"))

        assert response.status_code == 200
        assert response.data == {"unread_count": 0}

    def test_returns_zero_when_all_read(self, api_client: APIClient, invitee: User) -> None:
        make_notification(invitee, is_read=True)
        make_notification(invitee, is_read=True, ntype=NotificationType.INVITATION)

        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-unread-count"))

        assert response.status_code == 200
        assert response.data == {"unread_count": 0}

    def test_counts_unread_invitation_notifications(
        self, api_client: APIClient, invitee: User, pending_invitation: Invitation
    ) -> None:
        # pending_invitation fixture creates an unread invitation notification.
        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-unread-count"))

        assert response.status_code == 200
        assert response.data == {"unread_count": 1}

    def test_unauthenticated_cannot_fetch_count(self, api_client: APIClient) -> None:
        response = api_client.get(reverse("notification-unread-count"))

        assert response.status_code == 403


# ---------------------------------------------------------------------------
# GET /notifications/
# ---------------------------------------------------------------------------


class TestNotificationList:
    def test_returns_own_notifications_with_expected_fields(
        self, api_client: APIClient, invitee: User, stranger: User
    ) -> None:
        payload = {"invitation_id": 42, "org_name": "Trip", "invited_by": "bob"}
        invitation = make_notification(
            invitee, ntype=NotificationType.INVITATION, payload=payload, is_read=False
        )
        goal = make_notification(invitee, ntype=NotificationType.GOAL_COMPLETED, is_read=True)
        make_notification(stranger, is_read=False)

        base = datetime(2026, 8, 19, 12, 0, 0, tzinfo=UTC)
        set_created_at(invitation, base)
        set_created_at(goal, base + timedelta(hours=1))

        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-list"))

        assert response.status_code == 200
        items = {n["id"]: n for n in response.data["notifications"]}
        assert set(items) == {invitation.id, goal.id}

        item = items[invitation.id]
        assert item["type"] == NotificationType.INVITATION
        assert item["payload"] == payload
        assert item["is_read"] is False
        for key in ("id", "type", "payload", "is_read", "created_at"):
            assert key in item

        goal_item = items[goal.id]
        assert goal_item["type"] == NotificationType.GOAL_COMPLETED
        assert goal_item["is_read"] is True

    def test_returns_newest_first(self, api_client: APIClient, invitee: User) -> None:
        base = datetime(2026, 8, 19, 12, 0, 0, tzinfo=UTC)
        old = make_notification(invitee, is_read=True)
        middle = make_notification(invitee, is_read=True)
        newest = make_notification(invitee, is_read=True)
        set_created_at(old, base)
        set_created_at(middle, base + timedelta(days=1))
        set_created_at(newest, base + timedelta(days=2))

        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-list"))

        assert response.status_code == 200
        ids = [n["id"] for n in response.data["notifications"]]
        assert ids == [newest.id, middle.id, old.id]

    def test_returns_empty_list_when_no_notifications(
        self, api_client: APIClient, stranger: User
    ) -> None:
        api_client.force_authenticate(user=stranger)
        response = api_client.get(reverse("notification-list"))

        assert response.status_code == 200
        assert response.data == {"notifications": [], "unread_count": 0}

    def test_only_returns_own_notifications(
        self, api_client: APIClient, invitee: User, stranger: User
    ) -> None:
        make_notification(invitee)
        make_notification(stranger)
        make_notification(stranger)

        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-list"))

        assert response.status_code == 200
        assert len(response.data["notifications"]) == 1

    def test_list_marks_non_invitation_notifications_read(
        self, api_client: APIClient, invitee: User
    ) -> None:
        unread_transaction = make_notification(
            invitee, ntype=NotificationType.TRANSACTION_ADDED, is_read=False
        )
        unread_goal = make_notification(
            invitee, ntype=NotificationType.GOAL_COMPLETED, is_read=False
        )
        already_read = make_notification(invitee, is_read=True)

        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-list"))

        assert response.status_code == 200
        unread_transaction.refresh_from_db()
        unread_goal.refresh_from_db()
        already_read.refresh_from_db()
        assert unread_transaction.is_read is True
        assert unread_goal.is_read is True
        assert already_read.is_read is True

    def test_list_does_not_mark_invitation_notifications_read(
        self, api_client: APIClient, invitee: User, pending_invitation: Invitation
    ) -> None:
        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-list"))

        assert response.status_code == 200
        notification = Notification.objects.get(
            user=invitee,
            type=NotificationType.INVITATION,
            payload__invitation_id=pending_invitation.id,
        )
        assert notification.is_read is False
        # The invitation stays unread, so the recomputed count accounts for it.
        assert response.data["unread_count"] == 1

    def test_unread_count_in_response_is_computed_after_marking_read(
        self, api_client: APIClient, invitee: User
    ) -> None:
        make_notification(invitee, is_read=False)
        make_notification(invitee, is_read=False)

        api_client.force_authenticate(user=invitee)
        response = api_client.get(reverse("notification-list"))

        assert response.status_code == 200
        assert response.data["unread_count"] == 0
