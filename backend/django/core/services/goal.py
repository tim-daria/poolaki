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


def goal_status_transition_error(current: str, new: str) -> str | None:
    """Return an error message for an invalid goal status transition."""
    if current == GoalStatus.ARCHIVED and new != GoalStatus.ARCHIVED:
        return "Archived goals cannot be changed back to an active state."
    if current == GoalStatus.ACTIVE and new not in {
        GoalStatus.ACTIVE,
        GoalStatus.COMPLETED,
        GoalStatus.ARCHIVED,
    }:
        return "Invalid status transition."
    if current == GoalStatus.COMPLETED and new not in {
        GoalStatus.ACTIVE,
        GoalStatus.COMPLETED,
        GoalStatus.ARCHIVED,
    }:
        return "Invalid status transition."
    return None


@transaction.atomic
def archive_goal(goal: Goal, created_by: User) -> Goal:
    """Zero a goal's balance and archive it as one atomic domain operation."""
    locked_goal = Goal.objects.select_for_update().get(pk=goal.pk)
    if locked_goal.status == GoalStatus.ARCHIVED:
        return locked_goal

    org = Organization.objects.select_for_update().get(pk=locked_goal.org_id)
    remaining_balance = calculate_goal_balance(locked_goal)
    if remaining_balance < Decimal("0"):
        raise GoalArchivalError("Goal balance cannot be archived while negative.")

    if remaining_balance > Decimal("0"):
        create_transaction_entry(
            org=org,
            created_by=created_by,
            category_id=None,
            goal_id=locked_goal.id,
            entry_type=EntryType.WITHDRAW,
            amount=remaining_balance,
            description=f"Goal {locked_goal.name} archived",
            transaction_date=date.today(),
            is_tax_deductible=False,
        )

    if calculate_goal_balance(locked_goal) != Decimal("0"):
        raise GoalArchivalError("Goal balance must reach zero before archiving.")

    locked_goal.status = GoalStatus.ARCHIVED
    locked_goal.save(update_fields=["status"])
    return locked_goal
