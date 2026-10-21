from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Category, Goal, GoalStatus, Organization, Transaction, User

pytestmark = pytest.mark.django_db


def month_row(month: int, income: str = "0.00", expense: str = "0.00") -> dict[str, int | str]:
    return {
        "month": month,
        "income": income,
        "expense": expense,
        "contribution": "0.00",
        "withdraw": "0.00",
    }


def add_transaction(
    org: Organization,
    entry_type: str,
    amount: str,
    transaction_date: str,
    category: Category | None = None,
) -> Transaction:
    return Transaction.objects.create(
        org=org,
        entry_type=entry_type,
        amount=Decimal(amount),
        transaction_date=transaction_date,
        category=category,
    )


def add_goal(
    org: Organization,
    name: str,
    status: str = GoalStatus.ACTIVE,
) -> Goal:
    return Goal.objects.create(
        org=org,
        name=name,
        target_amount=Decimal("1000.00"),
        target_date=None,
        status=status,
    )


def add_goal_transaction(
    org: Organization,
    goal: Goal,
    entry_type: str,
    amount: str,
    transaction_date: str,
    category: Category | None = None,
) -> Transaction:
    return Transaction.objects.create(
        org=org,
        goal=goal,
        category=category,
        entry_type=entry_type,
        amount=Decimal(amount),
        transaction_date=transaction_date,
    )


def report_url(org_id: int) -> str:
    return reverse("organization-report", kwargs={"org_id": org_id})


@pytest.fixture
def report_client(api_client: APIClient, personal_user: tuple[User, Organization]) -> APIClient:
    user, _ = personal_user
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def report_categories(personal_user: tuple[User, Organization]) -> dict[str, Category]:
    """Income/expense categories: every reported row must be categorized."""
    _, org = personal_user
    return {
        "income": Category.objects.create(org=org, name="Salary", type="income"),
        "expense": Category.objects.create(org=org, name="Food", type="expense"),
    }


# ------------------------------------ #
#              Auth & access           #
# ------------------------------------ #


def test_report_requires_authentication(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    response = api_client.get(report_url(org.id))
    # app convention: anonymous requests are rejected with 403, not 401
    assert response.status_code == 403


def test_report_forbidden_for_non_member(
    api_client: APIClient, shared_org: Organization, stranger: User
) -> None:
    api_client.force_authenticate(user=stranger)
    response = api_client.get(report_url(shared_org.id))
    assert response.status_code == 403


def test_report_accessible_to_regular_member(
    api_client: APIClient, shared_org: Organization, member: User
) -> None:
    api_client.force_authenticate(user=member)
    response = api_client.get(report_url(shared_org.id))
    assert response.status_code == 200


def test_report_unknown_org_returns_403(api_client: APIClient, owner: User) -> None:
    # IsOrgMember runs before get_object_or_404, so a missing org reads as 403
    api_client.force_authenticate(user=owner)
    response = api_client.get(report_url(99999999))
    assert response.status_code == 403


# ------------------------------------ #
#               Year filter            #
# ------------------------------------ #


def test_default_year_is_current_year(
    report_client: APIClient,
    personal_user: tuple[User, Organization],
    report_categories: dict[str, Category],
) -> None:
    _, org = personal_user
    year = timezone.now().year
    add_transaction(org, "income", "100.00", f"{year}-06-15", category=report_categories["income"])

    response = report_client.get(report_url(org.id))

    assert response.status_code == 200
    data = response.json()
    assert data["year"] == year
    assert data["totals"]["income"] == "100.00"


def test_year_filter_excludes_other_years(
    report_client: APIClient,
    personal_user: tuple[User, Organization],
    report_categories: dict[str, Category],
) -> None:
    _, org = personal_user
    salary = report_categories["income"]
    add_transaction(org, "income", "100.00", "2024-03-10", category=salary)
    add_transaction(org, "income", "50.00", "2025-03-10", category=salary)

    data_2024 = report_client.get(report_url(org.id), {"year": 2024}).json()
    data_2025 = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data_2024["year"] == 2024
    assert data_2024["totals"]["income"] == "100.00"
    assert data_2025["year"] == 2025
    assert data_2025["totals"]["income"] == "50.00"


def test_year_without_data_returns_zeros(
    report_client: APIClient,
    personal_user: tuple[User, Organization],
    report_categories: dict[str, Category],
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "100.00", "2025-03-10", category=report_categories["income"])

    data = report_client.get(report_url(org.id), {"year": 2001}).json()

    assert data["totals"] == {
        "income": "0.00",
        "expense": "0.00",
        "contribution": "0.00",
        "withdraw": "0.00",
    }
    assert [entry["month"] for entry in data["monthly"]] == list(range(1, 13))
    assert all(entry[key] == "0.00" for entry in data["monthly"] for key in ("income", "expense"))
    assert data["categories"] == []
    assert data["goal_balance"] == "0.00"


def test_non_integer_year_returns_400(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    response = report_client.get(report_url(org.id), {"year": "abc"})
    assert response.status_code == 400


def test_year_out_of_range_returns_400(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    assert report_client.get(report_url(org.id), {"year": 1899}).status_code == 400
    assert report_client.get(report_url(org.id), {"year": 2101}).status_code == 400


# ------------------------------------ #
#               Totals                 #
# ------------------------------------ #


def test_totals_sum_income_and_expense_and_ignore_initial_balance(
    report_client: APIClient,
    personal_user: tuple[User, Organization],
    report_categories: dict[str, Category],
) -> None:
    _, org = personal_user
    org.initial_balance = Decimal("500.00")
    org.save(update_fields=["initial_balance"])
    add_transaction(org, "income", "100.10", "2025-01-05", category=report_categories["income"])
    add_transaction(org, "income", "20.00", "2025-02-05", category=report_categories["income"])
    add_transaction(org, "expense", "40.50", "2025-01-06", category=report_categories["expense"])

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["totals"] == {
        "income": "120.10",
        "expense": "40.50",
        "contribution": "0.00",
        "withdraw": "0.00",
    }


def test_sums_wider_than_one_amount_still_serialize(
    report_client: APIClient,
    personal_user: tuple[User, Organization],
    report_categories: dict[str, Category],
) -> None:
    """Rows are capped at 14 digits; a sum of them is not, and must not be."""
    _, org = personal_user
    for day in ("2025-01-05", "2025-01-06"):
        add_transaction(org, "income", "999999999999.99", day, category=report_categories["income"])

    response = report_client.get(report_url(org.id), {"year": 2025})

    assert response.status_code == 200
    data = response.json()
    assert data["totals"]["income"] == "1999999999999.98"
    assert data["monthly"][0]["income"] == "1999999999999.98"
    assert data["categories"][0]["total"] == "1999999999999.98"


def test_contribution_transactions_are_reported_but_excluded_from_categories(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    salary = Category.objects.create(org=org, name="Salary", type="income")
    food = Category.objects.create(org=org, name="Food", type="expense")
    goal = Category.objects.create(org=org, name="Contribution", type="contribution")
    add_transaction(org, "income", "100.00", "2025-01-05", category=salary)
    add_transaction(org, "expense", "30.00", "2025-01-06", category=food)
    add_transaction(org, "contribution", "25.00", "2025-02-07", category=goal)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["totals"] == {
        "income": "100.00",
        "expense": "30.00",
        "contribution": "25.00",
        "withdraw": "0.00",
    }
    assert data["monthly"][1] == {**month_row(2), "contribution": "25.00"}
    assert [(c["name"], c["type"]) for c in data["categories"]] == [
        ("Salary", "income"),
        ("Food", "expense"),
    ]


def test_amounts_are_two_decimal_strings(
    report_client: APIClient,
    personal_user: tuple[User, Organization],
    report_categories: dict[str, Category],
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "100.5", "2025-01-05", category=report_categories["income"])

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["totals"]["income"] == "100.50"
    assert data["monthly"][0]["income"] == "100.50"


# ------------------------------------ #
#               Monthly                #
# ------------------------------------ #


def test_monthly_returns_twelve_zero_filled_entries(
    report_client: APIClient,
    personal_user: tuple[User, Organization],
    report_categories: dict[str, Category],
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "10.00", "2025-02-01", category=report_categories["income"])
    add_transaction(org, "expense", "7.25", "2025-11-30", category=report_categories["expense"])

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    monthly = data["monthly"]
    assert [entry["month"] for entry in monthly] == list(range(1, 13))
    assert monthly[1] == month_row(2, income="10.00")
    assert monthly[10] == month_row(11, expense="7.25")
    assert monthly[0] == month_row(1)
    assert monthly[11] == month_row(12)


def test_monthly_sums_each_entry_type_separately(
    report_client: APIClient,
    personal_user: tuple[User, Organization],
    report_categories: dict[str, Category],
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "60.00", "2025-01-10", category=report_categories["income"])
    add_transaction(org, "income", "40.00", "2025-01-20", category=report_categories["income"])
    add_transaction(org, "expense", "40.00", "2025-01-15", category=report_categories["expense"])

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["monthly"][0] == month_row(1, income="100.00", expense="40.00")


def test_monthly_reports_contributions_and_withdrawals(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    goal = add_goal(org, "Savings")
    add_goal_transaction(org, goal, "contribution", "105.00", "2025-10-05")
    add_goal_transaction(org, goal, "withdraw", "5.00", "2025-10-15")
    add_goal_transaction(org, goal, "contribution", "14.00", "2025-11-05")

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["monthly"][9]["contribution"] == "105.00"
    assert data["monthly"][9]["withdraw"] == "5.00"
    assert data["monthly"][10]["contribution"] == "14.00"
    assert data["totals"]["contribution"] == "119.00"
    assert data["totals"]["withdraw"] == "5.00"


# ------------------------------------ #
#             Categories               #
# ------------------------------------ #


def test_categories_grouped_by_type_then_sorted_desc(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    salary = Category.objects.create(org=org, name="Salary", type="income")
    food = Category.objects.create(org=org, name="Food", type="expense")
    transport = Category.objects.create(org=org, name="Transport", type="expense")
    add_transaction(org, "income", "500.00", "2025-01-10", category=salary)
    add_transaction(org, "expense", "300.00", "2025-01-11", category=food)
    add_transaction(org, "expense", "100.00", "2025-01-13", category=transport)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    # type blocks: income, expense; total desc within a block
    categories = data["categories"]
    assert [(c["name"], c["type"], c["total"]) for c in categories] == [
        ("Salary", "income", "500.00"),
        ("Food", "expense", "300.00"),
        ("Transport", "expense", "100.00"),
    ]
    assert [c["category_id"] for c in categories] == [salary.pk, food.pk, transport.pk]


def test_categories_carry_zero_filled_monthly_series(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    food = Category.objects.create(org=org, name="Food", type="expense")
    add_transaction(org, "expense", "30.00", "2025-01-11", category=food)
    add_transaction(org, "expense", "20.00", "2025-03-15", category=food)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["categories"][0]["monthly"] == ["30.00", "0.00", "20.00"] + ["0.00"] * 9
    # invariant: the monthly series partitions the yearly total per category
    for category in data["categories"]:
        assert sum(Decimal(value) for value in category["monthly"]) == Decimal(category["total"])


def test_category_rows_partition_yearly_totals_per_type(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    salary = Category.objects.create(org=org, name="Salary", type="income")
    food = Category.objects.create(org=org, name="Food", type="expense")
    transport = Category.objects.create(org=org, name="Transport", type="expense")
    add_transaction(org, "income", "30.00", "2025-01-11", category=salary)
    add_transaction(org, "expense", "10.00", "2025-01-12", category=food)
    add_transaction(org, "expense", "90.00", "2025-01-13", category=transport)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    # invariant: category rows partition the yearly totals per type
    totals = data["totals"]
    for entry_type in ("income", "expense"):
        bucket = sum(Decimal(c["total"]) for c in data["categories"] if c["type"] == entry_type)
        assert bucket == Decimal(totals[entry_type])


def test_report_excludes_other_organizations(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    other_org = Organization.objects.create(name="Other budget", initial_balance=Decimal("0"))
    other_salary = Category.objects.create(org=other_org, name="Salary", type="income")
    add_transaction(other_org, "income", "9999.00", "2025-01-11", category=other_salary)
    salary = Category.objects.create(org=org, name="Salary", type="income")
    add_transaction(org, "income", "10.00", "2025-01-11", category=salary)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["totals"]["income"] == "10.00"
    assert [(c["name"], c["total"]) for c in data["categories"]] == [("Salary", "10.00")]


# ------------------------------------ #
#            Goal balance              #
# ------------------------------------ #


def test_goal_balance_sums_active_and_completed_goals(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    active = add_goal(org, "Emergency fund")
    completed = add_goal(org, "Trip", status=GoalStatus.COMPLETED)
    archived = add_goal(org, "Old fund", status=GoalStatus.ARCHIVED)
    add_goal_transaction(org, active, "contribution", "100.50", "2025-01-05")
    add_goal_transaction(org, active, "contribution", "49.50", "2025-02-05")
    add_goal_transaction(org, completed, "contribution", "200.00", "2025-01-05")
    add_goal_transaction(org, completed, "withdraw", "50.00", "2025-03-05")
    add_goal_transaction(org, archived, "contribution", "999.00", "2025-01-05")

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    # active 150.00 + completed 150.00; the archived goal is excluded
    assert data["goal_balance"] == "300.00"


def test_goal_balance_nets_withdrawals_and_goal_expenses(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    groceries = Category.objects.create(org=org, name="Groceries", type="expense")
    goal = add_goal(org, "Groceries fund", status=GoalStatus.COMPLETED)
    add_goal_transaction(org, goal, "contribution", "300.00", "2025-01-05")
    add_goal_transaction(org, goal, "withdraw", "120.00", "2025-02-05")
    add_goal_transaction(org, goal, "expense", "80.25", "2025-03-05", category=groceries)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    # 300.00 contribution - 120.00 withdraw - 80.25 goal expense
    assert data["goal_balance"] == "99.75"


def test_goal_balance_is_current_snapshot_independent_of_year(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    salary = Category.objects.create(org=org, name="Salary", type="income")
    goal = add_goal(org, "Savings")
    add_goal_transaction(org, goal, "contribution", "100.00", "2024-05-10")
    add_transaction(org, "income", "50.00", "2025-06-01", category=salary)

    data_2025 = report_client.get(report_url(org.id), {"year": 2025}).json()
    data_2024 = report_client.get(report_url(org.id), {"year": 2024}).json()

    # yearly sections follow the year, the goal balance does not
    assert data_2025["totals"]["income"] == "50.00"
    assert data_2024["totals"]["income"] == "0.00"
    assert data_2025["goal_balance"] == "100.00"
    assert data_2024["goal_balance"] == "100.00"


def test_goal_balance_excludes_other_organizations(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    other_org = Organization.objects.create(name="Other budget", initial_balance=Decimal("0"))
    goal = add_goal(org, "Mine")
    add_goal_transaction(org, goal, "contribution", "10.00", "2025-01-05")
    other_goal = add_goal(other_org, "Theirs")
    add_goal_transaction(other_org, other_goal, "contribution", "9999.00", "2025-01-05")

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["goal_balance"] == "10.00"


def test_report_includes_goal_status_and_month_end_balances(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    active = add_goal(org, "Car")
    completed = add_goal(org, "Housing", status=GoalStatus.COMPLETED)
    add_goal_transaction(org, active, "contribution", "100.00", "2025-10-05")
    add_goal_transaction(org, completed, "contribution", "14.00", "2025-11-05")

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["goals"] == [
        {
            "goal_id": active.pk,
            "name": "Car",
            "status": "active",
            "target_amount": "1000.00",
            "balance": "100.00",
            "monthly": ["0.00"] * 9 + ["100.00", "100.00", "100.00"],
        },
        {
            "goal_id": completed.pk,
            "name": "Housing",
            "status": "completed",
            "target_amount": "1000.00",
            "balance": "14.00",
            "monthly": ["0.00"] * 10 + ["14.00", "14.00"],
        },
    ]
