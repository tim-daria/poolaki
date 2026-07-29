from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    User,
)
from core.serializers import InitialBalanceSerializer
from core.services.balance import set_initial_balance
from core.services.exceptions import PersonalOrganizationMissingError
from core.services.organization import create_shared_organization


class SetInitialBalanceView(APIView):
    """
    Set or retrieve the initial balance for the authenticated user's personal organization.

    GET:
        Returns whether the user still needs to set an initial balance.

    POST:
        Updates the initial balance of the user's personal organization.

        Request body:
            {
                "initial_balance": "1000.00"
            }

        Responses:
            200 OK: Initial balance was successfully updated.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        needs_initial_balance = bool(request.session.get("needs_initial_balance", False))
        return Response({"needs_initial_balance": needs_initial_balance}, status=status.HTTP_200_OK)

    def _handle(self, request: Request) -> Response:
        assert isinstance(request.user, User)

        serializer = InitialBalanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        initial_balance = serializer.validated_data["initial_balance"]

        try:
            org = set_initial_balance(request.user, initial_balance)
        except PersonalOrganizationMissingError:
            return Response(
                {"error": "Personal organization is missing"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        request.session.pop("needs_initial_balance", None)
        request.session.modified = True

        return Response({"initial_balance": str(org.initial_balance)}, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        return self._handle(request)


class OrganizationCreateView(APIView):
    """
    Create a new shared organization.

    Request body:
    - name (string): Organization name.
    - initial_balance (decimal): Initial balance for the organization.

    Returns:
    - 201 Created with the created organization.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        name = request.data.get("name", "").strip()
        if not name:
            return Response({"error": "name is required"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = InitialBalanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        initial_balance = serializer.validated_data["initial_balance"]
        org = create_shared_organization(name, initial_balance, request.user)
        return Response(
            {"id": org.id, "name": org.name, "initial_balance": str(org.initial_balance)},
            status=status.HTTP_201_CREATED,
        )


@ensure_csrf_cookie
def csrf(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"detail": "CSRF cookie set"})


def health_check(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})
