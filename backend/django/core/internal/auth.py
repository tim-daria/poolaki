"""Bearer-token gate for the /api/internal/v1/ namespace.

Only the AI service holds the shared token, so a valid `Authorization`
header is the caller's service identity; no user is involved. An unset
INTERNAL_API_TOKEN fails closed: every request is rejected with 401."""

import secrets
from typing import Any

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication, exceptions, permissions
from rest_framework.request import Request
from rest_framework.views import APIView

# Marker stored in request.auth once the token verified.
INTERNAL_SERVICE_AUTH = "internal-service"


class InternalTokenAuthentication(authentication.BaseAuthentication):
    """Verifies the shared bearer token; a missing or invalid token is 401."""

    def authenticate_header(self, request: Request) -> str:
        # Without a challenge DRF coerces NotAuthenticated to 403
        return "Bearer"

    def authenticate(self, request: Request) -> tuple[Any, Any] | None:
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header.startswith("Bearer "):
            raise exceptions.NotAuthenticated("Missing bearer token.")
        token = header[len("Bearer ") :]
        expected = settings.INTERNAL_API_TOKEN
        if not expected or not secrets.compare_digest(
            token.encode("utf-8"), expected.encode("utf-8")
        ):
            raise exceptions.NotAuthenticated("Invalid bearer token.")
        return (AnonymousUser(), INTERNAL_SERVICE_AUTH)


class IsInternalService(permissions.BasePermission):
    """Only requests authenticated by InternalTokenAuthentication pass."""

    message = "Invalid service token."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.auth == INTERNAL_SERVICE_AUTH
