from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Membership, Organization

# from core.internal.base import InternalAPIView
# from core.internal.context import get_org_for_user
from core.serializers import (
    AiAnalyticsSummaryQuerySerializer,
    AiAnalyticsSummaryResponseSerializer,
)
from core.services.balance import calculate_org_balance
from core.services.report import get_org_report


class AiAnalyticsSummaryView(APIView):
    """POST /api/internal/v1/analytics/summary/

    Monthly income/expense distribution for a year (12 zero-filled rows) plus
    the current balance over the full transaction history. Auth: shared
    service Bearer token; the body user must be a member of the org.
    """

    def post(self, request: Request) -> Response:
        query = AiAnalyticsSummaryQuerySerializer(data=request.data)
        query.is_valid(raise_exception=True)
        data = query.validated_data
        year = data.get("year", timezone.now().year)

        # org = get_org_for_user(data["organization_id"], data["user_id"])
        org = get_object_or_404(Organization, pk=data["organization_id"])
        if not Membership.objects.filter(org=org, user_id=data["user_id"]).exists():
            raise PermissionError("User is not a member of the organization.")
        report = get_org_report(org, year)

        payload = {
            "year": report["year"],
            "balance": calculate_org_balance(org),
            "totals": report["totals"],
            "months": report["monthly"],
        }
        return Response(
            AiAnalyticsSummaryResponseSerializer(payload).data,
            status=status.HTTP_200_OK,
        )
