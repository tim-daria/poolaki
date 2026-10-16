"""Permission checks for the /api/internal/v1/ namespace."""

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from core.internal.authentication import INTERNAL_SERVICE_AUTH


class IsInternalService(BasePermission):
    """Allows only requests authenticated via InternalTokenAuthentication.

    Missing/invalid token never reaches here: the authenticator raises 401
    first, and with no successful authenticator DRF turns the permission
    failure into 401 instead of 403.
    """

    message = "Internal service token required."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.auth == INTERNAL_SERVICE_AUTH
