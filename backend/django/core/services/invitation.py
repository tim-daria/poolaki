from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from core.models import (
    Invitation,
    InvitationStatus,
    Membership,
    Notification,
    NotificationType,
    Organization,
    Role,
    User,
)
from core.services.organization import check_can_add_member, check_can_join_org


def create_invitation(org: Organization, invited_username: str, invited_by: User) -> Invitation:
    """
    Create a pending invitation for an existing user to join an organization.

    Looks up the user by username, validates that they can be invited,
    creates (or reuses) an Invitation record, and sends them a
    Notification. Does not create a Membership — that only happens once
    the invited user explicitly accepts.

    Args:
        org: The organization the user is being invited to.
        invited_username: Username of the user to invite. Must belong to
            an existing, registered user.
        invited_by: The user sending the invitation (assumed to already
            be verified as the organization's owner by the caller).

    Returns:
        The created Invitation.

    Raises:
        ValidationError: If the organization already has the maximum
            number of members including pending invitations, no user with this username exists, the
            user is already a member, or a pending invitation for them
            already exists.
    """
    if org.is_personal:
        raise ValidationError("Cannot invite users to a personal budget.")
    check_can_add_member(org)
    try:
        invited_user = User.objects.get(username__iexact=invited_username)
    except User.DoesNotExist:
        raise ValidationError("No user found with this username.") from None
    if Membership.objects.filter(user=invited_user, org=org).exists():
        raise ValidationError("This user is already a member.")
    pending_invitation = Invitation.objects.filter(
        org=org, invited_user=invited_user, status=InvitationStatus.PENDING
    ).first()
    if pending_invitation:
        raise ValidationError("This user already has a pending invitation.")
    invitation = Invitation.objects.create(
        org=org, invited_user=invited_user, invited_by=invited_by, status=InvitationStatus.PENDING
    )

    Notification.objects.create(
        user=invited_user,
        type=NotificationType.INVITATION,
        org=org,
        payload={
            "invitation_id": invitation.id,
            "org_name": org.name,
            "invited_by": invited_by.username,
        },
    )
    return invitation


def cancel_invitation(org_id: int, invitation_id: int) -> Invitation:
    """
    Cancel a pending invitation and return the updated invitation.

    Raises:
        ValidationError: If the invitation does not exist for the
            organization or is not pending.
    """
    try:
        invitation = Invitation.objects.get(id=invitation_id, org_id=org_id)
    except Invitation.DoesNotExist:
        raise ValidationError("Invitation not found for this organization.") from None
    if invitation.status != InvitationStatus.PENDING:
        raise ValidationError(f"Cannot cancel an invitation that is already {invitation.status}.")

    invitation.status = InvitationStatus.CANCELLED
    invitation.save(update_fields=["status"])
    return invitation


@transaction.atomic
def accept_invitation(invitation: Invitation, invited_user: User) -> Membership:
    """
    Accept a pending invitation, creating a Membership for the user and setting him Member Role.

    Verifies that the invitation was addressed to this user and is still
    pending, re-checks that the organization has room for one more member
    (capacity may have changed since the invitation was created), then
    creates the Membership and marks the invitation as accepted. The
    related invitation Notification is marked as read as part of this
    action, not when the notification list is only viewed.
    """
    if invitation.invited_user != invited_user:
        raise PermissionError("This invitation was not sent to you.")
    if invitation.status != InvitationStatus.PENDING:
        raise ValidationError(f"This invitation is already {invitation.status}.")
    check_can_join_org(invitation.org)
    membership = Membership.objects.create(user=invited_user, org=invitation.org, role=Role.MEMBER)
    invitation.status = InvitationStatus.ACCEPTED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["status", "responded_at"])

    _mark_invitation_notification_read(invitation, invited_user)

    return membership


def decline_invitation(invitation: Invitation, invited_user: User) -> Invitation:
    """
    Decline a pending invitation.

    Verifies that the invitation was addressed to this user and is still
    pending, then marks it as declined. No Membership is created. The
    related invitation Notification is marked as read as part of this
    action.
    """
    if invitation.invited_user != invited_user:
        raise PermissionError("This invitation was not sent to you.")
    if invitation.status != InvitationStatus.PENDING:
        raise ValidationError(f"This invitation is already {invitation.status}.")
    invitation.status = InvitationStatus.DECLINED
    invitation.responded_at = timezone.now()
    invitation.save(update_fields=["status", "responded_at"])

    _mark_invitation_notification_read(invitation, invited_user)

    return invitation


def _mark_invitation_notification_read(invitation: Invitation, user: User) -> None:
    """
    Marks the notification for this invitation as read.

    Invitation notifications are intentionally NOT marked read just by the
    user opening the notification list — only once they've actually acted
    on the invitation (accepted or declined), so a pending decision doesn't
    silently disappear from their unread count.
    """
    Notification.objects.filter(
        user=user, type=NotificationType.INVITATION, payload__invitation_id=invitation.id
    ).update(is_read=True)
