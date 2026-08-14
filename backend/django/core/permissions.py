from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from core.models import Membership, Role


class IsOrgMember(BasePermission):
    """Allows access only to users who are members of the organization in the URL."""

    message = "You are not a member of this organization."

    def has_permission(self, request: Request, view: APIView) -> bool:
        org_id = view.kwargs.get("org_id")
        if org_id is None:
            return False
        if not request.user.is_authenticated:
            return False
        return Membership.objects.filter(user=request.user, org_id=org_id).exists()


class IsOrgOwner(BasePermission):
    """Allows access only to the owner of the organization in the URL."""

    message = "Only the organization owner can perform this action."

    def has_permission(self, request: Request, view: APIView) -> bool:
        org_id = view.kwargs.get("org_id")
        if org_id is None or not request.user.is_authenticated:
            return False
        return Membership.objects.filter(user=request.user, org_id=org_id, role=Role.OWNER).exists()
