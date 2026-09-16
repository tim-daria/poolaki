from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from core.models import Invitation, InvitationStatus, Membership, Organization, Role, User

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


def leave_organization(user: User, org: Organization) -> dict[str, bool]:
    return {"organization_deleted": False}
