"""Reusable goal rules and workflows that must hold across API entry points."""

from datetime import date
from decimal import Decimal

from django.db import transaction

from core.models import EntryType, Goal, GoalStatus, Organization, User
from core.services.balance import calculate_goal_balance
from core.services.transaction import create_transaction_entry


class GoalArchivalError(Exception):
    """Raised when a goal cannot be archived while preserving its balance invariant."""


def allowed_entry_types(goal: Goal) -> set[EntryType]:
    """Return transaction types allowed for a goal in its current state."""
    entry_types: set[EntryType] = set()
    if goal.status == GoalStatus.ACTIVE:
        entry_types.update({EntryType.CONTRIBUTION, EntryType.WITHDRAW})
        if goal.target_date is None:
            entry_types.add(EntryType.EXPENSE)
    elif goal.status == GoalStatus.COMPLETED:
        entry_types.add(EntryType.EXPENSE)
    return entry_types


def _archive_goal(goal: Goal, created_by: User) -> Goal:
    """Zero a locked goal's balance and archive it within the caller's transaction."""
    org = Organization.objects.select_for_update().get(pk=goal.org_id)
    remaining_balance = calculate_goal_balance(goal)
    if remaining_balance < Decimal("0"):
        create_transaction_entry(
            org=org,
            created_by=created_by,
            category_id=None,
            goal_id=goal.id,
            entry_type=EntryType.CONTRIBUTION,
            amount=abs(remaining_balance),
            description=f"Goal {goal.name} archived",
            transaction_date=date.today(),
            is_tax_deductible=False,
        )
    elif remaining_balance > Decimal("0"):
        create_transaction_entry(
            org=org,
            created_by=created_by,
            category_id=None,
            goal_id=goal.id,
            entry_type=EntryType.WITHDRAW,
            amount=remaining_balance,
            description=f"Goal {goal.name} archived",
            transaction_date=date.today(),
            is_tax_deductible=False,
        )

    if calculate_goal_balance(goal) != Decimal("0"):
        raise GoalArchivalError("Goal balance must reach zero before archiving.")

    goal.status = GoalStatus.ARCHIVED
    goal.save(update_fields=["status"])
    return goal


@transaction.atomic
def archive_goal(goal: Goal, created_by: User) -> Goal:
    """Zero a goal's balance and archive it as one atomic domain operation."""
    locked_goal = Goal.objects.select_for_update().get(pk=goal.pk)
    if locked_goal.status == GoalStatus.ARCHIVED:
        return locked_goal
    return _archive_goal(locked_goal, created_by)


@transaction.atomic
def update_goal(goal: Goal, data: dict[str, object], user: User) -> Goal:
    """Apply goal fields and status transitions atomically."""
    locked_goal = Goal.objects.select_for_update().get(pk=goal.pk)
    current_status = locked_goal.status
    new_status = data.get("status")

    if new_status == GoalStatus.ARCHIVED and current_status != GoalStatus.ARCHIVED:
        _archive_goal(locked_goal, user)

    if current_status == GoalStatus.ACTIVE and new_status == GoalStatus.COMPLETED:
        locked_goal.completed_at = date.today()
    elif current_status == GoalStatus.COMPLETED and new_status == GoalStatus.ACTIVE:
        locked_goal.completed_at = None

    for field, value in data.items():
        setattr(locked_goal, field, value)
    locked_goal.save()
    return locked_goal
