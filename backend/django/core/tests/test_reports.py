from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Category, Organization, Transaction, User

pytestmark = pytest.mark.django_db


def month_row(month: int, income: str = "0.00", expense: str = "0.00") -> dict[str, int | str]:
    return {"month": month, "income": income, "expense": expense}


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

    assert data["totals"] == {"income": "0.00", "expense": "0.00"}
    assert [entry["month"] for entry in data["monthly"]] == list(range(1, 13))
    assert all(entry[key] == "0.00" for entry in data["monthly"] for key in ("income", "expense"))
    assert data["categories"] == []


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
    assert report_client.get(report_url(org.id), {"year": 1999}).status_code == 400
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

    assert data["totals"] == {"income": "120.10", "expense": "40.50"}


def test_contribution_transactions_excluded_from_all_sections(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    # Savings analytics are deferred until the `withdraw` entry type exists,
    # so contribution rows must not leak into any report section.
    _, org = personal_user
    salary = Category.objects.create(org=org, name="Salary", type="income")
    food = Category.objects.create(org=org, name="Food", type="expense")
    goal = Category.objects.create(org=org, name="Contribution", type="contribution")
    add_transaction(org, "income", "100.00", "2025-01-05", category=salary)
    add_transaction(org, "expense", "30.00", "2025-01-06", category=food)
    add_transaction(org, "contribution", "25.00", "2025-02-07", category=goal)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["totals"] == {"income": "100.00", "expense": "30.00"}
    assert data["monthly"][1] == month_row(2)
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
