from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.models import User
from core.permissions import IsOrgMember
from core.serializers import AiChatRequestSerializer
from core.services.ai_chat import send_question


class AiChatView(APIView):
    """Organization-scoped chat: forwards an authenticated member's question to
    the AI service and relays the generated answer."""

    permission_classes = [IsAuthenticated, IsOrgMember]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai_chat"

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        serializer = AiChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answer, intent = send_question(
            user_id=request.user.id,
            organization_id=org_id,
            question=serializer.validated_data["question"],
        )

        return Response(
            {"answer": answer, "metadata": {"intent": intent}},
            status=status.HTTP_200_OK,
        )
