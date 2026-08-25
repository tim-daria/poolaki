from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Notification, NotificationType, User
from core.serializers import MarkNotificationsReadSerializer


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

    GET:
    Query params:
    - is_read (bool, optional): filter by read status ("true"/"false").
      If omitted, returns all notifications.
    Returns:
    - 200 OK with up to 50 most recent notifications and the unread count.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        queryset = Notification.objects.filter(user=request.user)

        is_read_param = request.query_params.get("is_read")
        if is_read_param is not None:
            queryset = queryset.filter(is_read=is_read_param.lower() == "true")

        queryset = queryset.order_by("-created_at")[:50]
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

        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()

        return Response(
            {"notifications": notifications_data, "unread_count": unread_count},
            status=status.HTTP_200_OK,
        )


class MarkAllNotificationsReadView(APIView):
    """
    Mark the given notifications as read ("Clear all" button).

    The frontend passes the ids of the notifications it actually
    displayed to the user (from the last GET /notifications/ response),
    rather than the backend blindly marking everything currently unread —
    this avoids marking a notification as read if it arrived after the
    list was fetched but before the user clicked "Clear all".

    Invitation notifications are silently ignored even if included in the
    request — they can only be resolved by accepting or declining.

    POST:
    Request body:
    - notification_ids (list of int): ids to mark as read.

    Returns:
    - 200 OK with the number of notifications actually marked as read.
    - 400 Bad Request if notification_ids is missing or empty.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        serializer = MarkNotificationsReadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        notification_ids = serializer.validated_data["notification_ids"]
        updated = (
            Notification.objects.filter(id__in=notification_ids, user=request.user, is_read=False)
            .exclude(type=NotificationType.INVITATION)
            .update(is_read=True)
        )
        return Response({"marked_read": updated}, status=status.HTTP_200_OK)
