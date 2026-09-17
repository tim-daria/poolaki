from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Invitation, InvitationStatus, Organization, User
from core.permissions import IsOrgOwner
from core.serializers import InvitationCreateSerializer
from core.services.invitation import (
    accept_invitation,
    cancel_invitation,
    create_invitation,
    decline_invitation,
)


class InvitationListCreateView(APIView):
    """
    Manage invitations for authentificated users.

    GET:
    Return all pending invitations for the organization.
    Returns:
    - 200 OK with a list of pending invitations.
    - 403 Forbidden if the requesting user is not the organization owner.

    POST:
    Invite an existing user to join an organization.

    Only the organization owner may invite new members. The invited user
    is not added immediately — an Invitation is created with status
    "pending" and a Notification is sent to them.
    They must accept or decline it separately.

    Request body:
    - username (string): Username of the user to invite.

    Returns:
    - 201 Created with the invitation id, invited user and status, on success.
    - 400 Bad Request if the input is invalid, the organization is a personal
      budget, the user doesn't exist, is already a member, already has a pending
      invitation, or the organization has reached the maximum of 5 members.
    - 403 Forbidden if the requesting user is not the organization owner.
    """

    permission_classes = [IsAuthenticated, IsOrgOwner]

    def get(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        invitations = Invitation.objects.filter(
            org_id=org_id, status=InvitationStatus.PENDING
        ).select_related("invited_user", "invited_by")
        return Response(
            {
                "invitations": [
                    {
                        "id": invitation.id,
                        "invited_user": invitation.invited_user.username,
                        "invited_by": (
                            invitation.invited_by.username if invitation.invited_by else None
                        ),
                        "status": invitation.status,
                    }
                    for invitation in invitations
                ]
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)

        serializer = InvitationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data["username"]
        org = Organization.objects.get(id=org_id)

        try:
            invitation = create_invitation(org, username, request.user)
        except ValidationError as e:
            # changed to e.messages, so the error is shown to user
            # as plain text, not "['Error message']"
            # PermissionError doesn't have .messages, didn't get this change
            return Response({"error": "; ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "id": invitation.id,
                "invited_user": invitation.invited_user.username,
                "status": invitation.status,
            },
            status=status.HTTP_201_CREATED,
        )


class CancelInvitationView(APIView):
    """
    Cancel a pending invitation for an organization.
    Only the organization owner may cancel invitation.
    POST:
    Update invitatation status from pending to cancelled.

    Returns:
    - 200 Ok with the invitation id and status, on success.
    - 400 Bad Request if the invitation to this organization doesn't exist or if the
      invitation was already accepted, declined or cancelled.
    - 403 Forbidden if the requesting user is not the organization owner.
    """

    permission_classes = [IsAuthenticated, IsOrgOwner]

    def post(self, request: Request, org_id: int, invitation_id: int) -> Response:
        assert isinstance(request.user, User)

        try:
            invitation = cancel_invitation(org_id, invitation_id)
        except ValidationError as e:
            return Response({"error": "; ".join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"id": invitation.id, "status": invitation.status}, status=status.HTTP_200_OK
        )


class AcceptInvitationView(APIView):
    """
    Accept a pending invitation, joining the organization as a member.

    POST:
    Returns:
    - 200 OK with the organization id and name, on success.
    - 400 Bad Request if the invitation is no longer pending, or the
      organization has since reached its member limit.
    - 403 Forbidden if the invitation was not sent to the current user.
    - 404 Not Found if the invitation does not exist.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, invitation_id: int) -> Response:
        assert isinstance(request.user, User)
        invitation = get_object_or_404(Invitation, id=invitation_id)

        try:
            membership = accept_invitation(invitation, request.user)
        except PermissionError as e:
            return Response({"error": str(e)}, status=403)
        except ValidationError as e:
            return Response({"error": "; ".join(e.messages)}, status=400)

        return Response(
            {"organization_id": membership.org_id, "organization_name": membership.org.name},
            status=status.HTTP_200_OK,
        )


class DeclineInvitationView(APIView):
    """
    Decline a pending invitation.

    POST:
    Returns:
    - 200 OK with the invitation id and status, on success.
    - 400 Bad Request if the invitation is no longer pending.
    - 403 Forbidden if the invitation was not sent to the current user.
    - 404 Not Found if the invitation does not exist.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, invitation_id: int) -> Response:
        assert isinstance(request.user, User)
        invitation = get_object_or_404(Invitation, id=invitation_id)

        try:
            invitation = decline_invitation(invitation, request.user)
        except PermissionError as e:
            return Response({"error": str(e)}, status=403)
        except ValidationError as e:
            return Response({"error": "; ".join(e.messages)}, status=400)

        return Response(
            {"invitation_id": invitation_id, "status": invitation.status}, status=status.HTTP_200_OK
        )


class MyInvitationsView(APIView):
    """
    List pending invitations addressed to the current user, across all organizations.

    GET:
    Returns:
    - 200 OK with a list of pending invitations received by the user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        assert isinstance(request.user, User)
        invitations = Invitation.objects.filter(
            invited_user=request.user, status=InvitationStatus.PENDING
        ).select_related("org", "invited_by")
        return Response(
            {
                "invitations": [
                    {
                        "id": inv.id,
                        "organization_id": inv.org_id,
                        "organization_name": inv.org.name,
                        "invited_by": inv.invited_by.username if inv.invited_by else None,
                        "created_at": inv.created_at.isoformat(),
                    }
                    for inv in invitations
                ]
            },
            status=status.HTTP_200_OK,
        )
