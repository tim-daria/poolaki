from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from core.models import Membership, Organization, Role, User

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


def check_can_add_member(org: Organization) -> None:
    current_count = Membership.objects.filter(org=org).count()
    if current_count >= MAX_MEMBERS_PER_ORG:
        raise ValidationError(
            f"Organization already has the maximum of {MAX_MEMBERS_PER_ORG} members."
        )
