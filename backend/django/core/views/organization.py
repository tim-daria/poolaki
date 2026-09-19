from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Membership, Organization, User
from core.permissions import IsOrgMember, IsOrgOwner
from core.serializers import (
    InitialBalanceSerializer,
    OrganizationCreateSerializer,
    OrganizationNameSerializer,
)
from core.services.balance import calculate_org_balance, set_initial_balance
from core.services.exceptions import PersonalOrganizationMissingError
from core.services.organization import (
    create_shared_organization,
    leave_organization,
    remove_member,
    rename_organization,
)


class SetInitialBalanceView(APIView):
    """
    Set the initial balance for the authenticated user's personal organization.
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
                {"errors": ["Personal organization is missing"]},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
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
    - 400 Bad Request if the user has no name, invalid balance, or has
      reached the per-user organization limit.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        # Oldest workspace first; id breaks ties for memberships created in the
        # same instant, such as the personal workspace at signup.
        memberships = (
            Membership.objects.filter(user=request.user)
            .select_related("org")
            .order_by("joined_at", "id")
        )

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
            {"organizations": organizations},
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request) -> Response:
        assert isinstance(request.user, User)

        serializer = OrganizationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        name = serializer.validated_data["name"]
        initial_balance = serializer.validated_data["initial_balance"]
        try:
            org = create_shared_organization(name, initial_balance, request.user)
        except ValidationError as e:
            return Response({"errors": e.messages}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "id": org.id,
                "name": org.name,
                "initial_balance": str(org.initial_balance),
                "is_personal": org.is_personal,
            },
            status=status.HTTP_201_CREATED,
        )


class OrganizationUpdateView(APIView):
    """
    Rename an organization.

    Only the organization owner may rename it, and a user's personal
    budget cannot be renamed.

    PATCH:
    Request body:
    - name (string, 1-100 chars, whitespace-trimmed): the new organization name.

    Returns:
    - 200 OK with the updated organization id and name.
    - 400 Bad Request if the name is missing, empty, or longer than 100
      characters, or if the organization is a personal budget.
    - 403 Forbidden if the requester is not the organization owner.
    """

    permission_classes = [IsAuthenticated, IsOrgOwner]

    def patch(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)

        org = get_object_or_404(Organization, id=org_id)
        serializer = OrganizationNameSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            rename_organization(org, serializer.validated_data["name"])
        except ValidationError as e:
            return Response({"errors": e.messages}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"id": org.id, "name": org.name}, status=status.HTTP_200_OK)


class OrganizationMembersView(APIView):
    """
    GET
    Provides the list of members belonging to an organization.

    Access is restricted to authenticated users who are members of the
    requested organization.

    Returns:
        - 200 OK with a list of organization's members, including their user ID,
    username, role, and membership creation date.

    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int) -> Response:
        memberships = Membership.objects.filter(org_id=org_id).select_related("user")
        return Response(
            {
                "members": [
                    {
                        "user_id": m.user.id,
                        "username": m.user.username,
                        "role": m.role,
                        "joined_at": m.joined_at,
                    }
                    for m in memberships
                ]
            },
            status=status.HTTP_200_OK,
        )


class OrganizationLeaveView(APIView):
    """
    Leave an organization you are a member of.

    Owner departure transfers ownership to the longest-standing remaining
    member; leaving as the last member deletes the organization.

    - 200 OK on success.
    - 400 Bad Request if this is your personal budget.
    - 403 Forbidden if you are not a member of the organization.
    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)

        org = get_object_or_404(
            Organization,
            id=org_id,
        )
        try:
            organization_deleted = leave_organization(request.user, org)
        except PermissionError as e:
            return Response({"errors": [str(e)]}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as e:
            return Response({"errors": e.messages}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"organization_deleted": organization_deleted}, status=status.HTTP_200_OK)


class OrganizationMemberRemoveView(APIView):
    """
    Remove a member from the organization.

    Only the organization owner may remove members. The owner cannot
    remove themselves through this endpoint.

    DELETE:
    Returns:
    - 204 No Content on success.
    - 400 Bad Request if user_id is not an organization member (including
      unknown users), or is the requesting owner themselves.
    - 403 Forbidden if the requesting user is not the organization owner.
    """

    permission_classes = [IsAuthenticated, IsOrgOwner]

    def delete(self, request: Request, org_id: int, user_id: int) -> Response:
        assert isinstance(request.user, User)
        org = get_object_or_404(Organization, id=org_id)

        try:
            remove_member(org, user_id, request.user)
        except ValidationError as e:
            return Response({"errors": e.messages}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrganizationBalanceView(APIView):
    """
    GET
        Provides the current balance for the organization.
    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)

        org = get_object_or_404(
            Organization,
            id=org_id,
        )
        balance = calculate_org_balance(org)

        return Response(
            {
                "org_id": org_id,
                "balance": balance,
            },
            status=status.HTTP_200_OK,
        )
