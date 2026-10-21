from decimal import Decimal
from typing import Protocol, cast

from django.db.models import Case, DecimalField, ExpressionWrapper, F, Q, QuerySet, Sum, When
from django.db.models.functions import Coalesce

from core.models import EntryType, Goal, Membership, Organization, Transaction, User
from core.services.exceptions import PersonalOrganizationMissingError


class AnnotatedGoal(Protocol):
    _goal_balance: Decimal


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
            Sum(
                "amount",
                filter=Q(entry_type=EntryType.EXPENSE, goal__isnull=True),
            ),
            Decimal("0"),
        ),
        contribution=Coalesce(
            Sum("amount", filter=Q(entry_type=EntryType.CONTRIBUTION)),
            Decimal("0"),
        ),
        withdraw=Coalesce(
            Sum("amount", filter=Q(entry_type=EntryType.WITHDRAW)),
            Decimal("0"),
        ),
    )

    income = cast(Decimal, totals["income"])
    expense = cast(Decimal, totals["expense"])
    contribution = cast(Decimal, totals["contribution"])
    withdraw = cast(Decimal, totals["withdraw"])

    return org.initial_balance + income - expense - contribution + withdraw


def _signed_goal_amount_expression(amount_field: str, entry_type_field: str) -> Case:
    """Build an expression that adds contributions and subtracts other entries."""
    amount_field_type = DecimalField(max_digits=14, decimal_places=2)
    return Case(
        When(
            **{entry_type_field: EntryType.CONTRIBUTION},
            then=F(amount_field),
        ),
        default=-F(amount_field),
        output_field=amount_field_type,
    )


def calculate_goal_balance(goal: Goal) -> Decimal:
    """Return a goal's net balance from all of its contribution and debit entries."""
    total = Transaction.objects.filter(goal=goal).aggregate(
        balance=Coalesce(
            Sum(_signed_goal_amount_expression("amount", "entry_type")),
            Decimal("0"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
    )["balance"]
    return cast(Decimal, total)


def annotate_goal_balance(queryset: QuerySet[Goal]) -> QuerySet[Goal]:
    """Add each goal's balance to a queryset using one aggregate query."""
    amount_field = DecimalField(max_digits=14, decimal_places=2)
    return queryset.annotate(
        _goal_balance=ExpressionWrapper(
            Coalesce(
                Sum(
                    _signed_goal_amount_expression(
                        "transactions__amount",
                        "transactions__entry_type",
                    )
                ),
                Decimal("0"),
                output_field=amount_field,
            ),
            output_field=amount_field,
        )
    )


def get_annotated_goal_balance(goal: Goal) -> Decimal:
    # Goals without entries come back as scale-0 "0"; keep the 2-decimals contract.
    return Decimal(cast(AnnotatedGoal, goal)._goal_balance).quantize(Decimal("0.01"))
