from decimal import Decimal
from typing import TypedDict

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
        raise ValidationError(f"You can have a maximum of {MAX_ORGS_PER_USER} workspaces.")


class LeaveOrganizationResult(TypedDict):
    organization_deleted: bool
    org_name: str | None  # None if the organization keeps existing


@transaction.atomic
def leave_organization(user: User, org: Organization) -> LeaveOrganizationResult:
    """
    Remove the current user from an organization.

    If the leaving user is the owner and other members remain,
    ownership is automatically transferred to the longest-standing
    remaining member (ties broken by user id). If the leaving user is
    the last member, the organization is deleted and the recipients of
    its pending invitations are notified.
    """
    if org.is_personal:
        raise ValidationError("Can not leave your personal budget.")
    try:
        membership = Membership.objects.get(user=user, org=org)
    except Membership.DoesNotExist:
        raise ValidationError("You are not a member of this organization.") from None
    remaining = list(
        Membership.objects.filter(org=org)
        .exclude(pk=membership.pk)
        .select_related("user")
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
        Notification.objects.bulk_create(
            [
                Notification(
                    user_id=uid,
                    type=NotificationType.ORGANIZATION_DELETED,
                    payload={
                        "org_name": org_name,
                        "last_member": user.username,
                    },
                )
                for uid in pending_invitee_ids
            ]
        )
        return LeaveOrganizationResult(organization_deleted=True, org_name=org_name)
    if membership.role == Role.OWNER:
        # List is non-empty and ordered: first element is the longest-standing member.
        new_owner = remaining[0]
        new_owner.role = Role.OWNER
        new_owner.save(update_fields=["role"])
        notifications = [
            Notification(
                user=new_owner.user,
                type=NotificationType.OWNERSHIP_TRANSFERRED,
                org=org,
                payload={"previous_owner": user.username, "org_name": org_name},
            ),
            # the new owner already got the personal notification
            *[
                Notification(
                    user_id=uid,
                    type=NotificationType.OWNER_CHANGED,
                    org=org,
                    payload={
                        "previous_owner": user.username,
                        "new_owner": new_owner.user.username,
                        "org_name": org_name,
                    },
                )
                for uid in (m.user_id for m in remaining[1:])
            ],
        ]
        Notification.objects.bulk_create(notifications)

    membership.delete()
    Notification.objects.bulk_create(
        [
            Notification(
                user=m.user,
                type=NotificationType.MEMBER_LEFT,
                org=org,
                payload={"user": user.username, "org_name": org_name},
            )
            for m in remaining
        ]
    )

    return LeaveOrganizationResult(organization_deleted=False, org_name=None)


@transaction.atomic
def remove_member(org: Organization, user_id: int, owner: User) -> None:
    """
    Remove a member from an organization. Only the owner can do this, and
    the owner cannot remove themselves this way.
    """
    if user_id == owner.id:
        raise ValidationError("Use leave organization to remove yourself.")
    membership = Membership.objects.filter(org=org, user_id=user_id).select_related("user").first()
    if membership is None:
        raise ValidationError("This user is not a member of the organization.")
    target_user = membership.user
    membership.delete()

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
