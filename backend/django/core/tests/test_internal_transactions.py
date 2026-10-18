from datetime import date, timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Category, Goal, Organization, Transaction, User
from core.services.transaction import last_three_months_start

pytestmark = pytest.mark.django_db


def ai_transactions_url() -> str:
    return reverse("ai-transactions")


def post_transactions(
    api_client: APIClient,
    user: User,
    org: Organization,
    **extra: object,
) -> Any:
    # rest_framework test-client response stubs are private (_MonkeyPatchedResponse)
    return api_client.post(
        ai_transactions_url(),
        {"user_id": user.id, "organization_id": org.id, **extra},
        format="json",
    )


def add_transaction(
    org: Organization,
    entry_type: str,
    amount: str,
    transaction_date: str,
    category: Category | None = None,
    description: str | None = None,
    goal: Goal | None = None,
) -> Transaction:
    return Transaction.objects.create(
        org=org,
        entry_type=entry_type,
        amount=Decimal(amount),
        transaction_date=transaction_date,
        category=category,
        description=description,
        goal=goal,
    )


@pytest.fixture
def ai_user(personal_user: tuple[User, Organization]) -> User:
    user, _ = personal_user
    return user


@pytest.fixture
def ai_org(personal_user: tuple[User, Organization]) -> Organization:
    _, org = personal_user
    return org


@pytest.fixture
def ai_categories(ai_org: Organization) -> dict[str, Category]:
    return {
        "salary": Category.objects.create(org=ai_org, name="Salary", type="income"),
        "food": Category.objects.create(org=ai_org, name="Food", type="expense"),
    }


# ------------------------------------ #
#            Fixed window              #
# ------------------------------------ #


def test_last_three_months_start_crosses_year_boundary() -> None:
    assert last_three_months_start(date(2026, 6, 15)) == date(2026, 4, 1)
    assert last_three_months_start(date(2026, 1, 15)) == date(2025, 11, 1)
    assert last_three_months_start(date(2026, 2, 15)) == date(2025, 12, 1)


def test_window_covers_last_three_calendar_months(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    today = date.today()
    window_start = last_three_months_start(today)
    salary = ai_categories["salary"]
    add_transaction(ai_org, "income", "10.00", window_start.isoformat(), salary)
    add_transaction(
        ai_org, "income", "20.00", (window_start - timedelta(days=1)).isoformat(), salary
    )
    add_transaction(ai_org, "income", "30.00", "2024-01-10", salary)
    add_transaction(ai_org, "income", "40.00", today.isoformat(), salary)

    data = post_transactions(api_client, ai_user, ai_org).json()

    # boundary days are included: window start and today
    assert [row["amount"] for row in data["transactions"]] == ["40.00", "10.00"]


# ------------------------------------ #
#             Auth & access            #
# ------------------------------------ #


def test_non_member_user_is_forbidden(
    api_client: APIClient, shared_org: Organization, stranger: User
) -> None:
    response = post_transactions(api_client, stranger, shared_org)
    assert response.status_code == 403


def test_missing_org_returns_404(api_client: APIClient, ai_user: User) -> None:
    response = api_client.post(
        ai_transactions_url(),
        {"user_id": ai_user.id, "organization_id": 99999999},
        format="json",
    )
    assert response.status_code == 404


def test_missing_user_id_returns_400(api_client: APIClient, ai_org: Organization) -> None:
    response = api_client.post(ai_transactions_url(), {"organization_id": ai_org.id}, format="json")
    assert response.status_code == 400


def test_missing_organization_id_returns_400(api_client: APIClient, ai_user: User) -> None:
    response = api_client.post(ai_transactions_url(), {"user_id": ai_user.id}, format="json")
    assert response.status_code == 400


def test_legacy_filter_fields_are_ignored(
    api_client: APIClient, ai_user: User, ai_org: Organization
) -> None:
    # filter keys from the earlier contract draft are ignored, not rejected
    response = post_transactions(
        api_client,
        ai_user,
        ai_org,
        entry_type="expense",
        date_from="2026-01-01",
        date_to="2026-03-31",
        sort="date_asc",
        limit=5,
    )
    assert response.status_code == 200


# ------------------------------------ #
#               Ordering               #
# ------------------------------------ #


def test_newest_transactions_first(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    today = date.today()
    salary = ai_categories["salary"]
    add_transaction(ai_org, "income", "10.00", (today - timedelta(days=2)).isoformat(), salary)
    add_transaction(ai_org, "income", "20.00", today.isoformat(), salary)

    data = post_transactions(api_client, ai_user, ai_org).json()

    assert [row["amount"] for row in data["transactions"]] == ["20.00", "10.00"]


def test_all_window_rows_are_returned(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    # no row cap: every income/expense transaction in the window is returned
    row_count = 250
    today = date.today().isoformat()
    salary = ai_categories["salary"]
    created = Transaction.objects.bulk_create(
        [
            Transaction(
                org=ai_org,
                entry_type="income",
                amount=Decimal("1.00"),
                transaction_date=today,
                category=salary,
            )
            for _ in range(row_count)
        ]
    )

    rows = post_transactions(api_client, ai_user, ai_org).json()["transactions"]

    assert len(rows) == row_count
    # same-day ties break by id: newest id first
    assert rows[0]["id"] == created[-1].id
    assert rows[-1]["id"] == created[0].id


# ------------------------------------ #
#           Response shape             #
# ------------------------------------ #


def test_contribution_and_withdraw_are_excluded(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    # goal transfers are internal bookkeeping, not income/expense events
    today = date.today().isoformat()
    vacation = Goal.objects.create(org=ai_org, name="Vacation", target_amount=Decimal("3000.00"))
    add_transaction(ai_org, "contribution", "500.00", today, None, goal=vacation)
    add_transaction(ai_org, "withdraw", "200.00", today, None, goal=vacation)
    add_transaction(ai_org, "income", "10.00", today, ai_categories["salary"])
    add_transaction(ai_org, "expense", "5.00", today, ai_categories["food"])

    rows = post_transactions(api_client, ai_user, ai_org).json()["transactions"]

    assert {row["entry_type"] for row in rows} == {"income", "expense"}


def test_null_category_when_fk_unset(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    today = date.today().isoformat()
    add_transaction(ai_org, "income", "10.00", today, ai_categories["salary"])
    add_transaction(ai_org, "expense", "7.00", today, None, description="No category")

    rows = post_transactions(api_client, ai_user, ai_org).json()["transactions"]

    no_category_row = next(r for r in rows if r["description"] == "No category")
    assert no_category_row["category"] is None


def test_rows_carry_contract_shape(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    today = date.today().isoformat()
    txn = add_transaction(
        ai_org, "expense", "50.5", today, ai_categories["food"], description="Groceries"
    )

    data = post_transactions(api_client, ai_user, ai_org).json()
    row = data["transactions"][0]

    assert set(row) == {"id", "date", "description", "entry_type", "category", "amount"}
    assert row["id"] == txn.id
    assert row["date"] == today
    assert row["description"] == "Groceries"
    assert row["entry_type"] == "expense"
    assert row["category"] == "Food"
    assert row["amount"] == "50.50"


def test_other_orgs_transactions_excluded(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    today = date.today().isoformat()
    other_org = Organization.objects.create(name="Other budget", initial_balance=Decimal("0"))
    other_salary = Category.objects.create(org=other_org, name="Salary", type="income")
    add_transaction(other_org, "income", "9999.00", today, other_salary)
    add_transaction(ai_org, "income", "10.00", today, ai_categories["salary"])

    data = post_transactions(api_client, ai_user, ai_org).json()

    assert [row["amount"] for row in data["transactions"]] == ["10.00"]
