from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Notification, NotificationType, User


class UnreadNotificationCountView(APIView):
    """
    Return the current count of unread notifications for the badge icon.

    GET:
    Returns:
    - 200 OK with {"unread_count": <int>}.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


class NotificationListView(APIView):
    """
    List notifications for the current user, newest first.

    Also marks all non-invitation notifications as read as a side effect —
    invitation notifications keep their own read logic (see accept/decline).

    GET:
    Returns:
    - 200 OK with up to 50 most recent notifications and the unread count.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        queryset = Notification.objects.filter(user=request.user).order_by("-created_at")[:50]

        notifications_data = [
            {
                "id": n.id,
                "type": n.type,
                "payload": n.payload,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in queryset
        ]

        # Mark everything except invitations as read, since the user just saw them.
        Notification.objects.filter(user=request.user, is_read=False).exclude(
            type=NotificationType.INVITATION
        ).update(is_read=True)

        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()

        return Response(
            {"notifications": notifications_data, "unread_count": unread_count},
            status=status.HTTP_200_OK,
        )
