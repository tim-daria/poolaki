from decimal import Decimal

from core.models import Membership, Organization, User


def set_initial_balance(user: User, amount: Decimal) -> Organization:
    membership = Membership.objects.filter(user=user, org__is_personal=True).first()
    if membership is None:
        raise ValueError("Personal organization not found")

    org = membership.org
    org.initial_balance = amount
    org.save(update_fields=["initial_balance"])
    return org
