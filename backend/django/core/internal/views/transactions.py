from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Membership, Organization
from core.serializers import (
    AiTransactionsQuerySerializer,
    AiTransactionsResponseSerializer,
)
from core.services.transaction import get_org_ai_transactions


class AiTransactionsView(APIView):
    """
    Static transaction context for the AI service: all income/expense
    transactions of the last 3 calendar months (inclusive), newest first.
    Contribution/withdraw are goal transfers and are excluded.
    The AI Service sends no filters. Auth: the body user must be a member of
    the org.
    """

    def post(self, request: Request) -> Response:
        query = AiTransactionsQuerySerializer(data=request.data)
        query.is_valid(raise_exception=True)
        data = query.validated_data

        org = get_object_or_404(Organization, pk=data["organization_id"])
        if not Membership.objects.filter(org=org, user_id=data["user_id"]).exists():
            raise PermissionError("User is not a member of the organization.")

        rows = get_org_ai_transactions(org)
        return Response(
            AiTransactionsResponseSerializer({"transactions": rows}).data,
            status=status.HTTP_200_OK,
        )
