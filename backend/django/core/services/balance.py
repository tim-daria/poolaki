from decimal import Decimal

from core.models import Membership, Organization, User
from core.services.exceptions import PersonalOrganizationMissingError


def set_initial_balance(user: User, amount: Decimal) -> Organization:
    membership = Membership.objects.filter(user=user, org__is_personal=True).first()
    if membership is None:
        raise PersonalOrganizationMissingError("Personal organization is missing")

    org = membership.org
    org.initial_balance = amount
    org.save(update_fields=["initial_balance"])
    return org
