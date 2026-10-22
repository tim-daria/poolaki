"""Balance calculations and locked goal-invariant mutations."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol, cast

from django.db.models import Case, DecimalField, ExpressionWrapper, F, Q, QuerySet, Sum, When
from django.db.models.functions import Coalesce
from rest_framework import serializers

from core.models import EntryType, Goal, GoalStatus, Membership, Organization, Transaction, User
from core.services.exceptions import PersonalOrganizationMissingError


class AnnotatedGoal(Protocol):
    _goal_balance: Decimal


@dataclass(frozen=True)
class GoalBalanceMutation:
    """Describe a goal entry change using amounts before and after mutation."""

    entry_type: EntryType
    before_amount: Decimal
    after_amount: Decimal

    @classmethod
    def create(cls, entry_type: EntryType | str, amount: Decimal) -> "GoalBalanceMutation":
        return cls(EntryType(entry_type), Decimal("0"), amount)

    @classmethod
    def update(
        cls,
        entry_type: EntryType | str,
        before_amount: Decimal,
        after_amount: Decimal,
    ) -> "GoalBalanceMutation":
        return cls(EntryType(entry_type), before_amount, after_amount)

    @classmethod
    def delete(cls, entry_type: EntryType | str, amount: Decimal) -> "GoalBalanceMutation":
        return cls(EntryType(entry_type), amount, Decimal("0"))

    @property
    def delta(self) -> Decimal:
        return goal_entry_effect(self.entry_type, self.after_amount) - goal_entry_effect(
            self.entry_type, self.before_amount
        )


def goal_entry_effect(entry_type: EntryType | str, amount: Decimal) -> Decimal:
    """Return the signed balance effect of one goal transaction entry."""
    return amount if entry_type == EntryType.CONTRIBUTION else -amount


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


def lock_goal_and_validate_balance(
    goal_id: int,
    mutation: GoalBalanceMutation,
    *,
    error_message: str = "Transaction would violate the goal balance invariant.",
) -> Goal:
    """Lock a goal and reject changes that would violate its balance invariant."""
    goal = Goal.objects.select_for_update().get(pk=goal_id)
    resulting_balance = calculate_goal_balance(goal) + mutation.delta
    if resulting_balance < Decimal("0") or (
        goal.status == GoalStatus.ARCHIVED and resulting_balance != Decimal("0")
    ):
        raise serializers.ValidationError({"amount": [error_message]})
    return goal


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
