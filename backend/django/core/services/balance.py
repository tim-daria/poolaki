from decimal import Decimal
from typing import cast

from django.db.models import Q, Sum
from django.db.models.functions import Coalesce

from core.models import EntryType, Goal, Membership, Organization, Transaction, User
from core.services.exceptions import PersonalOrganizationMissingError


def set_initial_balance(user: User, amount: Decimal) -> Organization:
    membership = Membership.objects.filter(user=user, org__is_personal=True).first()
    if membership is None:
        raise PersonalOrganizationMissingError("Personal organization is missing")

    org = membership.org
    org.initial_balance = amount
    org.save(update_fields=["initial_balance"])
    return org


def calculate_org_balance(org: Organization) -> Decimal:
    totals = Transaction.objects.filter(org=org).aggregate(
        income=Coalesce(
            Sum("amount", filter=Q(entry_type=EntryType.INCOME)),
            Decimal("0"),
        ),
        expense=Coalesce(
            Sum("amount", filter=Q(entry_type=EntryType.EXPENSE)),
            Decimal("0"),
        ),
        contribution=Coalesce(
            Sum("amount", filter=Q(entry_type=EntryType.CONTRIBUTION)),
            Decimal("0"),
        ),
    )

    income = cast(Decimal, totals["income"])
    expense = cast(Decimal, totals["expense"])
    contribution = cast(Decimal, totals["contribution"])

    return org.initial_balance + income - expense - contribution


def calculate_goal_balance(org: Organization, goal: Goal) -> Decimal:
    totals = Transaction.objects.filter(org=org, goal=goal).aggregate(
        contribution=Coalesce(
            Sum("amount", filter=Q(entry_type=EntryType.CONTRIBUTION)),
            Decimal("0"),
        ),
    )

    contribution = cast(Decimal, totals["contribution"])

    return contribution
