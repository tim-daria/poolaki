from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Membership, Organization
from core.serializers import AiCategoriesResponseSerializer, AiQuerySerializer
from core.services.report import get_org_category_breakdown


class AiCategoriesView(APIView):
    """
    The organization's income/expense categories, each with its zero-filled
    12-slot monthly series for the requested year (index 0 = January).
    Categories without activity in the year are included zero-filled;
    contribution categories are excluded. Auth: the body user must be a
    member of the org.
    """

    def post(self, request: Request) -> Response:
        query = AiQuerySerializer(data=request.data)
        query.is_valid(raise_exception=True)
        data = query.validated_data
        year = data.get("year", timezone.now().year)

        org = get_object_or_404(Organization, pk=data["organization_id"])
        if not Membership.objects.filter(org=org, user_id=data["user_id"]).exists():
            raise PermissionError("User is not a member of the organization.")

        payload = {
            "year": year,
            "categories": get_org_category_breakdown(org, year, include_inactive=True),
        }
        return Response(
            AiCategoriesResponseSerializer(payload).data,
            status=status.HTTP_200_OK,
        )
