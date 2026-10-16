from collections.abc import Callable
from contextlib import AbstractContextManager
from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Goal, GoalStatus, Organization, Transaction, User
from core.serializers import GoalResponseSerializer
from core.services.balance import annotate_goal_balance

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
    assert response.data["total"] == 1

    response = api_client.get(goals_url(shared_org.id), {"status": "unknown"})
    assert response.status_code == 400
    assert response.data == {"status": ['"unknown" is not a valid choice.']}


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
    archived_transaction = Transaction.objects.get(
        org=shared_org,
        goal=goal,
        entry_type="withdraw",
        amount=Decimal("125.50"),
    )
    assert archived_transaction.description == "Archived Laptop"
    assert response.data["goal"]["balance"] == "0.00"


def test_archiving_negative_goal_balance_creates_compensating_contribution(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Overdrawn",
        target_amount=Decimal("100.00"),
        target_date=date(2027, 1, 1),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="withdraw",
        amount=Decimal("25.00"),
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
    archived_transaction = Transaction.objects.get(
        goal=goal,
        entry_type="contribution",
        description="Archived Overdrawn",
    )
    assert archived_transaction.org_id == shared_org.id
    assert archived_transaction.created_by_id == owner.id
    assert archived_transaction.amount == Decimal("25.00")
    assert archived_transaction.transaction_date == date.today()
    assert archived_transaction.is_tax_deductible is False
    assert response.data["goal"]["balance"] == "0.00"


def test_archiving_goal_compensates_only_the_net_negative_balance(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Emergency fund",
        target_amount=Decimal("100.00"),
        target_date=date(2027, 1, 1),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="withdraw",
        amount=Decimal("40.00"),
        transaction_date=date(2026, 9, 1),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=goal,
        entry_type="contribution",
        amount=Decimal("10.00"),
        transaction_date=date(2026, 9, 2),
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        {"status": "archived", "name": "Emergency reserve"},
        format="json",
    )

    assert response.status_code == 200
    goal.refresh_from_db()
    assert goal.name == "Emergency reserve"
    assert goal.status == GoalStatus.ARCHIVED
    compensation = Transaction.objects.get(
        goal=goal,
        entry_type="contribution",
        description="Archived Emergency fund",
    )
    assert compensation.amount == Decimal("30.00")
    assert response.data["goal"]["balance"] == "0.00"


def test_goal_status_transitions_update_completed_at(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Trip",
        target_amount=Decimal("100.00"),
        target_date=date(2027, 1, 1),
        status=GoalStatus.ACTIVE,
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        {"status": "completed"},
        format="json",
    )

    assert response.status_code == 200
    goal.refresh_from_db()
    assert goal.status == GoalStatus.COMPLETED
    assert goal.completed_at == date.today()
    assert response.data["goal"]["completed_at"] == date.today().isoformat()

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        {"status": "active"},
        format="json",
    )

    assert response.status_code == 200
    goal.refresh_from_db()
    assert goal.status == GoalStatus.ACTIVE
    assert goal.completed_at is None
    assert response.data["goal"]["completed_at"] is None


def test_goal_list_serializes_balances_with_one_query(
    owner: User,
    shared_org: Organization,
    django_assert_num_queries: Callable[[int], AbstractContextManager[None]],
) -> None:
    first_goal = Goal.objects.create(
        org=shared_org,
        name="First",
        target_amount=Decimal("100.00"),
        target_date=None,
        created_by=owner,
    )
    second_goal = Goal.objects.create(
        org=shared_org,
        name="Second",
        target_amount=Decimal("200.00"),
        target_date=None,
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=first_goal,
        entry_type="contribution",
        amount=Decimal("25.00"),
        transaction_date=date(2026, 9, 1),
        created_by=owner,
    )
    Transaction.objects.create(
        org=shared_org,
        goal=second_goal,
        entry_type="contribution",
        amount=Decimal("50.00"),
        transaction_date=date(2026, 9, 1),
        created_by=owner,
    )

    queryset = annotate_goal_balance(
        Goal.objects.filter(org=shared_org).select_related("created_by")
    ).order_by("id")
    with django_assert_num_queries(1):
        data = GoalResponseSerializer(queryset, many=True).data

    assert [item["balance"] for item in data] == ["25.00", "50.00"]


def test_goal_serializer_requires_an_annotated_balance(
    owner: User,
    shared_org: Organization,
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Unannotated",
        target_amount=Decimal("100.00"),
        target_date=None,
        created_by=owner,
    )

    with pytest.raises(AttributeError):
        assert GoalResponseSerializer(goal).data


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


def test_goal_update_allows_partial_updates_and_unchanged_name(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Vacation",
        target_amount=Decimal("3000.00"),
        target_date=date(2027, 6, 1),
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        {"target_amount": "3500.00"},
        format="json",
    )

    assert response.status_code == 200
    goal.refresh_from_db()
    assert goal.name == "Vacation"
    assert goal.target_amount == Decimal("3500.00")


def test_goal_update_can_clear_target_date_and_overdue_flag(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Vacation",
        target_amount=Decimal("3000.00"),
        target_date=date(2026, 10, 9),
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        {"target_date": None},
        format="json",
    )

    assert response.status_code == 200
    goal.refresh_from_db()
    assert goal.target_date is None
    assert response.data["goal"]["target_date"] is None
    assert response.data["goal"]["overdue"] is False


@pytest.mark.parametrize(
    ("payload", "field", "value"),
    [
        ({"name": "Archived reserve"}, "name", "Vacation"),
        ({"target_amount": "3500.00"}, "target_amount", Decimal("3000.00")),
        ({"target_date": "2027-08-01"}, "target_date", date(2027, 6, 1)),
        ({"status": "archived"}, "status", GoalStatus.ARCHIVED),
    ],
)
def test_archived_goal_rejects_every_update(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
    payload: dict[str, object],
    field: str,
    value: object,
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Vacation",
        target_amount=Decimal("3000.00"),
        target_date=date(2027, 6, 1),
        status=GoalStatus.ARCHIVED,
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        payload,
        format="json",
    )

    assert response.status_code == 400
    goal.refresh_from_db()
    assert getattr(goal, field) == value


def test_goal_update_rejects_duplicate_name_in_same_organization(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Vacation",
        target_amount=Decimal("3000.00"),
        target_date=date(2027, 6, 1),
        created_by=owner,
    )
    duplicate = Goal.objects.create(
        org=shared_org,
        name="Trip",
        target_amount=Decimal("1000.00"),
        target_date=date(2027, 7, 1),
        created_by=owner,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        goal_url(shared_org.id, goal.id),
        {"name": duplicate.name},
        format="json",
    )

    assert response.status_code == 400
    assert response.data == {"name": ["A goal with this name already exists in this organization."]}


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
