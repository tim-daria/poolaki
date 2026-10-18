from decimal import Decimal
from typing import Any

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Category, Organization, Transaction, User

pytestmark = pytest.mark.django_db


def ai_categories_url() -> str:
    return reverse("ai-categories")


def post_categories(
    api_client: APIClient,
    user: User,
    org: Organization,
    **extra: object,
) -> Any:
    # rest_framework test-client response stubs are private (_MonkeyPatchedResponse)
    return api_client.post(
        ai_categories_url(),
        {"user_id": user.id, "organization_id": org.id, **extra},
        format="json",
    )


def add_transaction(
    org: Organization,
    entry_type: str,
    amount: str,
    transaction_date: str,
    category: Category,
) -> Transaction:
    return Transaction.objects.create(
        org=org,
        entry_type=entry_type,
        amount=Decimal(amount),
        transaction_date=transaction_date,
        category=category,
    )


def category_row(data: Any, name: str) -> Any:
    return next(c for c in data["categories"] if c["name"] == name)


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
        "freelance": Category.objects.create(org=ai_org, name="Freelance", type="income"),
        "food": Category.objects.create(org=ai_org, name="Food", type="expense"),
        "health": Category.objects.create(org=ai_org, name="Health", type="expense"),
        "contribution": Category.objects.create(
            org=ai_org, name="Contribution", type="contribution"
        ),
    }


# ------------------------------------ #
#             Auth & access            #
# ------------------------------------ #


def test_non_member_user_is_forbidden(
    api_client: APIClient, shared_org: Organization, stranger: User
) -> None:
    response = post_categories(api_client, stranger, shared_org)
    assert response.status_code == 403


def test_member_user_is_allowed(
    api_client: APIClient, shared_org: Organization, member: User
) -> None:
    response = post_categories(api_client, member, shared_org)
    assert response.status_code == 200


def test_missing_org_returns_404(api_client: APIClient, ai_user: User) -> None:
    response = api_client.post(
        ai_categories_url(),
        {"user_id": ai_user.id, "organization_id": 99999999},
        format="json",
    )
    assert response.status_code == 404


# ------------------------------------ #
#           Request validation         #
# ------------------------------------ #


def test_missing_user_id_returns_400(api_client: APIClient, ai_org: Organization) -> None:
    response = api_client.post(ai_categories_url(), {"organization_id": ai_org.id}, format="json")
    assert response.status_code == 400


def test_missing_organization_id_returns_400(api_client: APIClient, ai_user: User) -> None:
    response = api_client.post(ai_categories_url(), {"user_id": ai_user.id}, format="json")
    assert response.status_code == 400


def test_year_out_of_range_returns_400(
    api_client: APIClient, ai_user: User, ai_org: Organization
) -> None:
    for year in (1899, 2101):
        assert post_categories(api_client, ai_user, ai_org, year=year).status_code == 400


# ------------------------------------ #
#              Year filter             #
# ------------------------------------ #


def test_default_year_is_current_year(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    year = timezone.now().year
    add_transaction(ai_org, "income", "100.00", f"{year}-06-15", ai_categories["salary"])

    data = post_categories(api_client, ai_user, ai_org).json()

    assert data["year"] == year
    assert category_row(data, "Salary")["total"] == "100.00"


def test_year_filter_scopes_the_breakdown(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    add_transaction(ai_org, "income", "100.00", "2024-03-10", ai_categories["salary"])
    add_transaction(ai_org, "income", "50.00", "2025-03-10", ai_categories["salary"])

    data = post_categories(api_client, ai_user, ai_org, year=2025).json()

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

    data = post_categories(api_client, ai_user, ai_org, year=2025).json()

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

    data = post_categories(api_client, ai_user, ai_org, year=2025).json()

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
    data = post_categories(api_client, ai_user, ai_org, year=2025).json()

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

    data = post_categories(api_client, ai_user, ai_org, year=2025).json()

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

    data = post_categories(api_client, ai_user, ai_org, year=2025).json()

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

    data = post_categories(api_client, ai_user, ai_org, year=2025).json()

    assert all(c["category_id"] != other_salary.pk for c in data["categories"])
    assert category_row(data, "Salary")["total"] == "10.00"
