from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Notification, User


class NotificationListView(APIView):
    """
    List notifications for the current user, newest first.

    GET:
    Query params:
    - is_read (bool, optional): filter by read status ("true"/"false").
      If omitted, returns all notifications.

    Returns:
    - 200 OK with up to 100 most recent notifications and the unread count.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        queryset = Notification.objects.filter(user=request.user)

        is_read_param = request.query_params.get("is_read")
        if is_read_param is not None:
            queryset = queryset.filter(is_read=is_read_param.lower() == "true")

        queryset = queryset.order_by("-created_at")[:100]
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()

        return Response(
            {
                "notifications": [
                    {
                        "id": n.id,
                        "type": n.type,
                        "payload": n.payload,
                        "is_read": n.is_read,
                        "created_at": n.created_at.isoformat(),
                    }
                    for n in queryset
                ],
                "unread_count": unread_count,
            },
            status=status.HTTP_200_OK,
        )
