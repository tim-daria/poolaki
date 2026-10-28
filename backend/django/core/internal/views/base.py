from abc import ABC, abstractmethod
from typing import Any

from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.internal.auth import InternalTokenAuthentication, IsInternalService
from core.models import Membership, Organization
from core.serializers import AiQuerySerializer


class AiOrgView(APIView, ABC):
    """Internal AI endpoint: gate on the shared bearer token (401 otherwise),
    parse the shared body (user_id, organization_id, optional year), check
    the body user is a member of the org (unknown org -> 404, non-member ->
    403), wrap the subclass payload in its response serializer and return
    200. Subclasses must implement build_payload()."""

    authentication_classes = [InternalTokenAuthentication]
    permission_classes = [IsInternalService]

    response_serializer: type[serializers.Serializer[dict[str, Any]]]

    def post(self, request: Request) -> Response:
        query = AiQuerySerializer(data=request.data)
        query.is_valid(raise_exception=True)
        data = query.validated_data
        org = get_authorized_org(data)
        return Response(self.response_serializer(self.build_payload(org, data)).data)

    @abstractmethod
    def build_payload(self, org: Organization, data: dict[str, Any]) -> dict[str, Any]:
        """Build the response payload for the authorized org."""


def get_authorized_org(data: dict[str, Any]) -> Organization:
    """Body-based org scoping: 404 on unknown org, 403 for non-members."""
    org = get_object_or_404(Organization, pk=data["organization_id"])
    if not Membership.objects.filter(org=org, user_id=data["user_id"]).exists():
        raise PermissionError("User is not a member of the organization.")
    return org
