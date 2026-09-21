from django.db import transaction

from core.models import Membership, Organization, Role, User
from core.services.category import create_default_categories


@transaction.atomic
def create_personal_organization(user: User) -> Organization:
    org = Organization.objects.create(
        name=f"{user.username}'s budget",
        initial_balance=0,
        is_personal=True,
    )
    Membership.objects.create(user=user, org=org, role=Role.OWNER)
    create_default_categories(org)
    return org
