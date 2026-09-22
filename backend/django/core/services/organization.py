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
from core.services.category import create_default_categories

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
    create_default_categories(org)
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
        raise ValidationError(f"You can have a maximum of {MAX_ORGS_PER_USER} workspaces.")


def _notify_users(
    user_ids: list[int],
    ntype: NotificationType,
    payload: dict[str, object],
    *,
    org: Organization | None = None,
) -> None:
    """Canonical notification fan-out; single place owning the write shape."""
    if not user_ids:
        return
    Notification.objects.bulk_create(
        Notification(user_id=uid, type=ntype, org=org, payload=payload) for uid in user_ids
    )


@transaction.atomic
def leave_organization(user: User, org: Organization) -> bool:
    """
    Remove the current user from an organization.

    If the leaving user is the owner and other members remain,
    ownership is automatically transferred to the longest-standing
    remaining member (ties broken by user id). If the leaving user is
    the last member, the organization is deleted and the recipients of
    its pending invitations are notified.

    Returns:
        True if the organization was deleted.
    """
    # Serialize membership mutations (leave/remove) against the org row.
    Organization.objects.select_for_update().get(pk=org.pk)
    if org.is_personal:
        raise ValidationError("Can not leave your personal budget.")
    try:
        membership = Membership.objects.get(user=user, org=org)
    except Membership.DoesNotExist:
        # Safety net: the view's IsOrgMember permission answers 403 first.
        raise PermissionError("You are not a member of this organization.") from None
    remaining = list(
        Membership.objects.filter(org=org)
        .exclude(pk=membership.pk)
        .order_by("joined_at", "user_id")
    )
    org_name = org.name
    if not remaining:
        pending_invitee_ids = list(
            Invitation.objects.filter(org=org, status=InvitationStatus.PENDING).values_list(
                "invited_user_id", flat=True
            )
        )
        org.delete()
        _notify_users(
            pending_invitee_ids,
            NotificationType.ORGANIZATION_DELETED,
            {"org_name": org_name, "last_member": user.username},
        )
        return True
    if membership.role == Role.OWNER:
        # List is non-empty and ordered: first element is the longest-standing member.
        new_owner = remaining[0]
        Membership.objects.filter(pk=new_owner.pk).update(role=Role.OWNER)
        _notify_users(
            [new_owner.user_id],
            NotificationType.OWNERSHIP_TRANSFERRED,
            {"previous_owner": user.username, "org_name": org_name},
            org=org,
        )
        # the new owner gets only the personal notification above
        _notify_users(
            [m.user_id for m in remaining[1:]],
            NotificationType.OWNER_CHANGED,
            {
                "previous_owner": user.username,
                "new_owner": new_owner.user.username,
                "org_name": org_name,
            },
            org=org,
        )
    membership.delete()
    _notify_users(
        [m.user_id for m in remaining],
        NotificationType.MEMBER_LEFT,
        {"user": user.username, "org_name": org_name},
        org=org,
    )
    return False


@transaction.atomic
def remove_member(org: Organization, user_id: int, owner: User) -> None:
    """
    Remove a member from an organization. Only the owner can do this, and
    the owner cannot remove themselves this way.
    """
    if user_id == owner.id:
        raise ValidationError("Use leave organization to remove yourself.")
    # Serialize membership mutations (leave/remove) against the org row.
    Organization.objects.select_for_update().get(pk=org.pk)
    membership = Membership.objects.filter(org=org, user_id=user_id).select_related("user").first()
    if membership is None:
        raise ValidationError("This user is not a member of the organization.")
    target_user = membership.user
    membership.delete()

    _notify_users(
        [target_user.id],
        NotificationType.REMOVED_FROM_ORG,
        {"org_name": org.name, "removed_by": owner.username},
        org=org,
    )
    _notify_users(
        list(Membership.objects.filter(org=org).values_list("user_id", flat=True)),
        NotificationType.MEMBER_REMOVED,
        {
            "org_name": org.name,
            "removed_user": target_user.username,
            "removed_by": owner.username,
        },
        org=org,
    )


def rename_organization(org: Organization, new_name: str) -> None:
    """Rename a shared organization in place. Personal budgets are not renamable."""
    if org.is_personal:
        raise ValidationError("The name of your personal budget cannot be changed.")
    org.name = new_name
    org.save(update_fields=["name"])
