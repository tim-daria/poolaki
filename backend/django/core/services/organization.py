from decimal import Decimal
from typing import Any

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


@transaction.atomic
def create_shared_organization(org_name: str, amount: Decimal, owner: User) -> Organization:
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


def leave_organization(user: User, org: Organization) -> dict[str, Any]:
    """
    Remove the current user from an organization.

    If the leaving user is the owner and other members remain,
    ownership is automatically transferred to the longest-standing
    remaining member. If the leaving user is the last member, the
    organization (and everything belonging to it) is deleted.

    Returns:
        A dict with "organization_deleted": True if the user was the last
        member and the organization was removed, False otherwise.
    """
    if org.is_personal:
        raise ValidationError("Can not leave your personal budget.")
    membership = Membership.objects.filter(user=user, org=org).first()
    if membership is None:
        raise ValidationError("You are not a member of this organization.")
    remaining = Membership.objects.filter(org=org).exclude(user=user)
    if not remaining.exists():
        org_name = org.name
        membership.delete()
        org.delete()
        return {"organization_deleted": True, "org_name": org_name}
    if membership.role == Role.OWNER:
        new_owner = remaining.order_by("joined_at").first()
        if new_owner:
            new_owner.role = Role.OWNER
            new_owner.save(update_fields=["role"])
            Notification.objects.create(
                user=new_owner.user,
                type=NotificationType.OWNERSHIP_TRANSFERRED,
                org=org,
                payload={"previous_owner": user.username, "org_name": org.name},
            )
    membership.delete()
    Notification.objects.bulk_create(
        [
            Notification(
                user=m.user,
                type=NotificationType.MEMBER_LEFT,
                org=org,
                payload={"user": user.username, "org_name": org.name},
            )
            for m in remaining
        ]
    )

    return {"organization_deleted": False}
