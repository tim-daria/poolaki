from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Category, Organization, User
from core.tests.internal.helpers import AI_CATEGORIES_URL, add_transaction, post_ai_endpoint

pytestmark = pytest.mark.django_db


@pytest.fixture
def ai_categories(ai_org: Organization) -> dict[str, Category]:
    return {
        "salary": Category.objects.create(org=ai_org, name="Salary", type="income"),
        "freelance": Category.objects.create(org=ai_org, name="Freelance", type="income"),
        "food": Category.objects.create(org=ai_org, name="Food", type="expense"),
        "health": Category.objects.create(org=ai_org, name="Health", type="expense"),
        "contribution": Category.objects.create(
            org=ai_org, name="Contribution", type="contribution"
        ),
    }


def category_row(data: Any, name: str) -> Any:
    return next(c for c in data["categories"] if c["name"] == name)


# ------------------------------------ #
#              Year filter             #
# ------------------------------------ #


def test_default_year_is_current_year(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    year = timezone.now().year
    add_transaction(ai_org, "income", "100.00", f"{year}-06-15", ai_categories["salary"])

    data = post_ai_endpoint(api_client, AI_CATEGORIES_URL, ai_user, ai_org).json()

    assert data["year"] == year
    assert category_row(data, "Salary")["total"] == "100.00"


def test_year_filter_scopes_the_breakdown(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    add_transaction(ai_org, "income", "100.00", "2024-03-10", ai_categories["salary"])
    add_transaction(ai_org, "income", "50.00", "2025-03-10", ai_categories["salary"])

    data = post_ai_endpoint(api_client, AI_CATEGORIES_URL, ai_user, ai_org, year=2025).json()

    assert data["year"] == 2025
    assert category_row(data, "Salary")["total"] == "50.00"


# ------------------------------------ #
#           Category rows              #
# ------------------------------------ #


def test_rows_carry_contract_shape(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    salary = ai_categories["salary"]
    add_transaction(ai_org, "income", "100.00", "2025-01-15", salary)

    data = post_ai_endpoint(api_client, AI_CATEGORIES_URL, ai_user, ai_org, year=2025).json()

    row = category_row(data, "Salary")
    assert set(row) == {"category_id", "name", "type", "total", "monthly"}
    assert row["category_id"] == salary.pk
    assert row["type"] == "income"


def test_income_first_then_expense_then_total_desc_then_name(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    cats = ai_categories
    # equal income totals exercise the name tie-break: Freelance < Salary
    add_transaction(ai_org, "income", "500.00", "2025-01-10", cats["salary"])
    add_transaction(ai_org, "income", "500.00", "2025-01-11", cats["freelance"])
    add_transaction(ai_org, "expense", "300.00", "2025-01-12", cats["food"])
    add_transaction(ai_org, "expense", "100.00", "2025-01-13", cats["health"])

    data = post_ai_endpoint(api_client, AI_CATEGORIES_URL, ai_user, ai_org, year=2025).json()

    assert [(c["name"], c["type"], c["total"]) for c in data["categories"]] == [
        ("Freelance", "income", "500.00"),
        ("Salary", "income", "500.00"),
        ("Food", "expense", "300.00"),
        ("Health", "expense", "100.00"),
    ]


def test_inactive_categories_are_zero_filled(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    # no 2025 transactions: every income/expense category must still appear
    data = post_ai_endpoint(api_client, AI_CATEGORIES_URL, ai_user, ai_org, year=2025).json()

    assert [(c["name"], c["type"]) for c in data["categories"]] == [
        ("Freelance", "income"),
        ("Salary", "income"),
        ("Food", "expense"),
        ("Health", "expense"),
    ]
    assert all(c["total"] == "0.00" for c in data["categories"])
    assert all(c["monthly"] == ["0.00"] * 12 for c in data["categories"])


def test_contribution_categories_excluded(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    add_transaction(ai_org, "contribution", "25.00", "2025-02-07", ai_categories["contribution"])

    data = post_ai_endpoint(api_client, AI_CATEGORIES_URL, ai_user, ai_org, year=2025).json()

    assert "Contribution" not in [c["name"] for c in data["categories"]]


# ------------------------------------ #
#          Monthly series              #
# ------------------------------------ #


def test_monthly_series_sums_months_zero_filled_january_first(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    food = ai_categories["food"]
    add_transaction(ai_org, "expense", "30.00", "2025-03-15", food)
    add_transaction(ai_org, "expense", "20.00", "2025-03-20", food)
    add_transaction(ai_org, "expense", "5.00", "2025-12-31", food)

    data = post_ai_endpoint(api_client, AI_CATEGORIES_URL, ai_user, ai_org, year=2025).json()

    row = category_row(data, "Food")
    assert row["monthly"] == ["0.00", "0.00", "50.00"] + ["0.00"] * 8 + ["5.00"]
    assert len(row["monthly"]) == 12
    # invariant: the monthly series partitions the yearly total per category
    assert sum(Decimal(str(v)) for v in row["monthly"]) == Decimal(str(row["total"]))


def test_other_orgs_categories_and_transactions_are_excluded(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    other_org = Organization.objects.create(name="Other budget", initial_balance=Decimal("0"))
    other_salary = Category.objects.create(org=other_org, name="Salary", type="income")
    add_transaction(other_org, "income", "9999.00", "2025-01-11", other_salary)
    add_transaction(ai_org, "income", "10.00", "2025-01-11", ai_categories["salary"])

    data = post_ai_endpoint(api_client, AI_CATEGORIES_URL, ai_user, ai_org, year=2025).json()

    assert all(c["category_id"] != other_salary.pk for c in data["categories"])
    assert category_row(data, "Salary")["total"] == "10.00"
