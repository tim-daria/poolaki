from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Goal, GoalStatus, Organization, Transaction, User

pytestmark = pytest.mark.django_db


def goals_url(org_id: int) -> str:
    return reverse("goal-list-create", kwargs={"org_id": org_id})


def goal_url(org_id: int, goal_id: int) -> str:
    return reverse("goal-detail", kwargs={"org_id": org_id, "goal_id": goal_id})


def goal_balance_url(org_id: int, goal_id: int) -> str:
    return reverse("goal-balance", kwargs={"org_id": org_id, "goal_id": goal_id})


def test_list_goals_filters_by_status(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    active = Goal.objects.create(
        org=shared_org,
        name="Laptop",
        target_amount=Decimal("2000.00"),
        target_date=date(2027, 1, 1),
        status=GoalStatus.ACTIVE,
        created_by=owner,
    )
    Goal.objects.create(
        org=shared_org,
        name="Trip",
        target_amount=Decimal("600.00"),
        target_date=date(2027, 2, 1),
        status=GoalStatus.COMPLETED,
        created_by=owner,
    )
    Goal.objects.create(
        org=shared_org,
        name="Books",
        target_amount=Decimal("100.00"),
        target_date=date(2027, 3, 1),
        status=GoalStatus.ARCHIVED,
        created_by=owner,
    )

    api_client.force_authenticate(user=owner)

    response = api_client.get(goals_url(shared_org.id), {"status": "active"})
    assert response.status_code == 200
    assert [item["id"] for item in response.data["goals"]] == [active.id]

    response = api_client.get(goals_url(shared_org.id), {"status": "unknown"})
    assert response.status_code == 200
    assert response.data["goals"] == []


def test_owner_can_archive_goal_and_return_remaining_balance(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Laptop",
        target_amount=Decimal("1000.00"),
        target_date=date(2027, 1, 1),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="contribution",
        amount=Decimal("125.50"),
        transaction_date=date(2026, 9, 1),
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        {"status": "archived"},
        format="json",
    )

    assert response.status_code == 200
    goal.refresh_from_db()
    assert goal.status == GoalStatus.ARCHIVED
    shared_org.refresh_from_db()
    assert shared_org.initial_balance == Decimal("0")
    assert Transaction.objects.filter(
        org=shared_org,
        goal=goal,
        entry_type="withdraw",
        amount=Decimal("125.50"),
    ).exists()
    assert response.data["goal"]["balance"] == "0.00"


def test_goal_update_requires_owner_or_creator(
    api_client: APIClient, member: User, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Vacation",
        target_amount=Decimal("3000.00"),
        target_date=date(2027, 6, 1),
        created_by=owner,
    )
    api_client.force_authenticate(user=member)

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        {"name": "Not allowed"},
        format="json",
    )

    assert response.status_code == 403


def test_goal_balance_uses_contribution_transactions(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Trip",
        target_amount=Decimal("2500.00"),
        target_date=date(2027, 8, 1),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="contribution",
        amount=Decimal("50.00"),
        transaction_date=date(2026, 9, 1),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="contribution",
        amount=Decimal("75.00"),
        transaction_date=date(2026, 9, 2),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="withdraw",
        amount=Decimal("30.00"),
        transaction_date=date(2026, 9, 3),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="expense",
        amount=Decimal("20.00"),
        transaction_date=date(2026, 9, 4),
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.get(goal_balance_url(shared_org.id, goal.id))

    assert response.status_code == 200
    assert response.data["balance"] == "75.00"


def test_goal_response_includes_progress_overdue_and_spendable(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Trip",
        target_amount=Decimal("150.00"),
        target_date=date(2026, 10, 9),
        status=GoalStatus.ACTIVE,
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="contribution",
        amount=Decimal("75.00"),
        transaction_date=date(2026, 10, 1),
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.get(goal_url(shared_org.id, goal.id))

    assert response.status_code == 200
    assert response.data["goal"]["progress"] == "0.50"
    assert response.data["goal"]["overdue"] is True
    assert response.data["goal"]["spendable"] is False


def test_completed_or_undated_active_goals_are_spendable(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    completed_goal = Goal.objects.create(
        org=shared_org,
        name="Completed",
        target_amount=Decimal("100.00"),
        target_date=date(2027, 1, 1),
        status=GoalStatus.COMPLETED,
        created_by=owner,
    )
    undated_goal = Goal.objects.create(
        org=shared_org,
        name="Flexible",
        target_amount=Decimal("100.00"),
        target_date=None,
        status=GoalStatus.ACTIVE,
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    completed_response = api_client.get(goal_url(shared_org.id, completed_goal.id))
    undated_response = api_client.get(goal_url(shared_org.id, undated_goal.id))

    assert completed_response.data["goal"]["spendable"] is True
    assert undated_response.data["goal"]["spendable"] is True
