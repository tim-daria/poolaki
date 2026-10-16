"""Bearer-token authentication for the /api/internal/v1/ namespace.

The token authenticates the calling service (AI Service), not an end user;
the end user arrives in the request body and is checked separately.
"""

import secrets

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication, exceptions
from rest_framework.request import Request

# request.auth marker: proves InternalTokenAuthentication succeeded, so the
# permission can distinguish internal calls from any other authenticator.
INTERNAL_SERVICE_AUTH = "internal-service"


class InternalTokenAuthentication(authentication.BaseAuthentication):
    """Validates the shared internal API token provisioned through Vault.

    Compared in constant time; an unconfigured token (empty setting) rejects
    every request, so the namespace fails closed in misconfigured environments.
    """

    def authenticate(self, request: Request) -> tuple[AnonymousUser, str] | None:
        scheme, _, token = request.META.get("HTTP_AUTHORIZATION", "").partition(" ")
        # No (valid-shaped) credentials: return None so DRF treats the request
        # as unauthenticated; IsInternalService then yields 401, not 403.
        if scheme.lower() != "bearer" or not token:
            return None

        expected = settings.INTERNAL_API_TOKEN.encode()
        if not expected or not secrets.compare_digest(token.encode(), expected):
            raise exceptions.AuthenticationFailed("Invalid internal API token.")

        return (AnonymousUser(), INTERNAL_SERVICE_AUTH)

    def authenticate_header(self, request: Request) -> str:
        # Without it DRF coerces 401 auth failures into 403 PermissionDenied.
        return "Bearer"
