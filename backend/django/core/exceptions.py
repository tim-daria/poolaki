"""
DRF exception handler (REST_FRAMEWORK["EXCEPTION_HANDLER"]).

Maps service-level exceptions to the API error contract:
Django ValidationError -> 400, builtin PermissionError -> 403,
PersonalOrganizationMissingError -> 500. Everything else falls through
to DRF's default handler (401/403/404 and DRF-native errors).
"""

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

from core.services.exceptions import PersonalOrganizationMissingError


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    if isinstance(exc, PersonalOrganizationMissingError):
        return Response({"errors": [str(exc)]}, status=500)
    if isinstance(exc, ValidationError):
        return Response({"errors": exc.messages}, status=400)
    if isinstance(exc, PermissionError):
        return Response({"errors": [str(exc)]}, status=403)
    return exception_handler(exc, context)
