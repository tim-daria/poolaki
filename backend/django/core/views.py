from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Membership, User
from core.serializers import InitialBalanceSerializer
from core.services.balance import set_initial_balance
from core.services.exceptions import PersonalOrganizationMissingError
from core.services.organization import create_shared_organization


@ensure_csrf_cookie
def csrf(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"detail": "CSRF cookie set"})


def health_check(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


class SetInitialBalanceView(APIView):
    """
    # Set or retrieve the initial balance for the authenticated user's personal organization.
    # GET:
    #     Returns whether the user still needs to set an initial balance.
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

    # def get(self, request: Request) -> Response:
    # needs_initial_balance = bool(request.session.get("needs_initial_balance", False))
    # return Response({"needs_initial_balance": needs_initial_balance}, status=status.HTTP_200_OK)

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

        # if we move question about balance to the registration form, we won't need this:
        # request.session.pop("needs_initial_balance", None)
        # request.session.modified = True

        return Response({"initial_balance": str(org.initial_balance)}, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        return self._handle(request)


class OrganizationListCreateView(APIView):
    """
    Manage organizations for the authenticated user.

    GET:
    Returns a list of organizations where the current user is a member.

    Returns:
    - 200 OK with a list of organizations for GET requests.

    POST:
    Create a new shared organization for the authenticated user and switch to it.

    Request body:
    - name (string): Organization name.
    - initial_balance (decimal): Initial balance for the organization.

    Returns:
    - 201 Created with the created organization.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        memberships = Membership.objects.filter(user=request.user).select_related("org")
        current_org_id = request.session.get("current_organization_id")

        organizations = [
            {
                "id": m.org.id,
                "name": m.org.name,
                "is_personal": m.org.is_personal,
                "role": m.role,
            }
            for m in memberships
        ]
        return Response(
            {"current_organization_id": current_org_id, "organizations": organizations},
            status=status.HTTP_200_OK,
        )

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

        request.session["current_organization_id"] = org.id
        request.session.modified = True
        return Response(
            {
                "id": org.id,
                "name": org.name,
                "initial_balance": str(org.initial_balance),
                "is_personal": org.is_personal,
            },
            status=status.HTTP_201_CREATED,
        )


class SwitchOrganizationView(APIView):
    """
    Switch the current organization for the authenticated user.

    The selected organization is stored in the user's session and is used
    as the default organization after page reloads.

    Request:
    - POST /organizations/{org_id}/select/
    - org_id (int): ID of the organization to select.

    Returns:
    - 200 OK with the selected organization ID.
    - 403 Forbidden if the user is not a member of the organization.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)

        if not Membership.objects.filter(user=request.user, org_id=org_id).exists():
            return Response(
                {"error": "You are not a member of this organization"},
                status=status.HTTP_403_FORBIDDEN,
            )
        request.session["current_organization_id"] = org_id
        request.session.modified = True
        return Response({"current_organization_id": org_id})
