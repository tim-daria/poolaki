from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

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

MAX_MEMBERS_PER_ORG = 5
MAX_ORGS_PER_USER = 10


@transaction.atomic
def create_shared_organization(org_name: str, amount: Decimal, owner: User) -> Organization:
    check_can_join_more_orgs(owner)
    org = Organization.objects.create(
        name=org_name,
        initial_balance=amount,
        is_personal=False,
    )
    Membership.objects.create(user=owner, org=org, role=Role.OWNER)
    return org


def get_available_slots(org: Organization) -> int:
    current_members = Membership.objects.filter(org=org).count()
    pending_invitations = Invitation.objects.filter(
        org=org, status=InvitationStatus.PENDING
    ).count()
    occupied = current_members + pending_invitations
    return max(MAX_MEMBERS_PER_ORG - occupied, 0)


def check_can_add_member(org: Organization) -> None:
    """Used when creating a new invitation."""
    if get_available_slots(org) <= 0:
        raise ValidationError(
            f"Organization has reached its maximum capacity of {MAX_MEMBERS_PER_ORG} members "
            f"(including pending invitations)."
        )


def check_can_join_org(org: Organization) -> None:
    """Used when accepting an invitation — only counts actual members."""
    current_members = Membership.objects.filter(org=org).count()
    if current_members >= MAX_MEMBERS_PER_ORG:
        raise ValidationError(
            f"Organization has reached its maximum capacity of {MAX_MEMBERS_PER_ORG} members."
        )


def check_can_join_more_orgs(user: User) -> None:
    """Used when creating new organization and accepting an invitation."""
    current_count = Membership.objects.filter(user=user).count()
    if current_count >= MAX_ORGS_PER_USER:
        raise ValidationError(
            f"You cannot belong to more than {MAX_MEMBERS_PER_ORG} organizations."
        )


@transaction.atomic
def remove_member(org: Organization, target_user: User, owner: User) -> None:
    """
    Remove a member from an organization. Only the owner can do this, and
    the owner cannot remove themselves this way.
    """
    if target_user.id == owner.id:
        raise ValidationError("Use delete organization to remove yourself.")
    membership = Membership.objects.filter(user=target_user, org=org).first()
    if membership is None:
        raise ValidationError("This user is not a member of the organization.")
    membership.delete()

    # Values-only lookup: the fan-out needs just user ids, avoids N+1 on the User FK.
    remaining_user_ids = list(Membership.objects.filter(org=org).values_list("user_id", flat=True))
    notifications = [
        Notification(
            user_id=target_user.id,
            type=NotificationType.REMOVED_FROM_ORG,
            org=org,
            payload={"org_name": org.name, "removed_by": owner.username},
        ),
        *[
            Notification(
                user_id=uid,
                type=NotificationType.MEMBER_REMOVED,
                org=org,
                payload={
                    "org_name": org.name,
                    "removed_user": target_user.username,
                    "removed_by": owner.username,
                },
            )
            for uid in remaining_user_ids
        ],
    ]
    Notification.objects.bulk_create(notifications)
