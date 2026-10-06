from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Organization, User
from core.permissions import IsOrgMember
from core.serializers import ReportQuerySerializer, ReportResponseSerializer
from core.services.report import get_org_report


class ReportView(APIView):
    """
    Yearly finance report for the reporting page.

    GET
    Returns yearly aggregates for the organization: income/expense/contribution
    totals, a 12-month distribution (zero-filled), and the per-category
    breakdown for the selected year.

    Query parameters:
    - year (optional, integer 2000..2100): calendar year to report on.
        Defaults to the server's current year.

    Returns:
    - 200 OK with the report payload.
    - 400 Bad Request when `year` is not an integer or out of range.
    - 403 Forbidden if you are not a member of the organization.
    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        org = get_object_or_404(Organization, pk=org_id)

        query = ReportQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        year: int = query.validated_data.get("year") or timezone.now().year

        report = get_org_report(org, year)
        return Response(ReportResponseSerializer(report).data, status=status.HTTP_200_OK)
