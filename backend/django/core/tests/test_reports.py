from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Category, Organization, Transaction, User

pytestmark = pytest.mark.django_db


def month_row(
    month: int, income: str = "0.00", expenses: str = "0.00", contribution: str = "0.00"
) -> dict[str, int | str]:
    return {"month": month, "income": income, "expenses": expenses, "contribution": contribution}


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
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    year = timezone.now().year
    add_transaction(org, "income", "100.00", f"{year}-06-15")

    response = report_client.get(report_url(org.id))

    assert response.status_code == 200
    data = response.json()
    assert data["year"] == year
    assert data["totals"]["income"] == "100.00"


def test_year_filter_excludes_other_years(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "100.00", "2024-03-10")
    add_transaction(org, "income", "50.00", "2025-03-10")

    data_2024 = report_client.get(report_url(org.id), {"year": 2024}).json()
    data_2025 = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data_2024["year"] == 2024
    assert data_2024["totals"]["income"] == "100.00"
    assert data_2025["year"] == 2025
    assert data_2025["totals"]["income"] == "50.00"


def test_year_without_data_returns_zeros(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "100.00", "2025-03-10")

    data = report_client.get(report_url(org.id), {"year": 2001}).json()

    assert data["totals"] == {"income": "0.00", "expenses": "0.00", "contribution": "0.00"}
    assert [entry["month"] for entry in data["monthly"]] == list(range(1, 13))
    assert all(
        row[key] == "0.00"
        for row in data["monthly"]
        for key in ("income", "expenses", "contribution")
    )
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
    assert report_client.get(report_url(org.id), {"year": 0}).status_code == 400
    assert report_client.get(report_url(org.id), {"year": 10_000}).status_code == 400


# ------------------------------------ #
#               Totals                 #
# ------------------------------------ #


def test_totals_sum_all_entry_types_and_ignore_initial_balance(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    org.initial_balance = Decimal("500.00")
    org.save(update_fields=["initial_balance"])
    add_transaction(org, "income", "100.10", "2025-01-05")
    add_transaction(org, "income", "20.00", "2025-02-05")
    add_transaction(org, "expense", "40.50", "2025-01-06")
    add_transaction(org, "contribution", "25.00", "2025-01-07")

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["totals"] == {"income": "120.10", "expenses": "40.50", "contribution": "25.00"}


def test_amounts_are_two_decimal_strings(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "100.5", "2025-01-05")

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["totals"]["income"] == "100.50"
    assert data["monthly"][0]["income"] == "100.50"


# ------------------------------------ #
#               Monthly                #
# ------------------------------------ #


def test_monthly_returns_twelve_zero_filled_entries(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "10.00", "2025-02-01")
    add_transaction(org, "expense", "7.25", "2025-11-30")

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    monthly = data["monthly"]
    assert [entry["month"] for entry in monthly] == list(range(1, 13))
    assert monthly[1] == month_row(2, income="10.00")
    assert monthly[10] == month_row(11, expenses="7.25")
    assert monthly[0] == month_row(1)
    assert monthly[11] == month_row(12)


def test_monthly_sums_each_entry_type_separately(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    add_transaction(org, "income", "60.00", "2025-01-10")
    add_transaction(org, "income", "40.00", "2025-01-20")
    add_transaction(org, "expense", "40.00", "2025-01-15")
    add_transaction(org, "contribution", "20.00", "2025-12-01")

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["monthly"][0] == month_row(1, income="100.00", expenses="40.00")
    assert data["monthly"][11] == month_row(12, contribution="20.00")


# ------------------------------------ #
#             Categories               #
# ------------------------------------ #


def test_categories_grouped_and_sorted_desc(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    salary = Category.objects.create(org=org, name="Salary", type="income")
    food = Category.objects.create(org=org, name="Food", type="expense")
    transport = Category.objects.create(org=org, name="Transport", type="expense")
    goal = Category.objects.create(org=org, name="Contribution", type="contribution")
    add_transaction(org, "income", "500.00", "2025-01-10", category=salary)
    add_transaction(org, "expense", "300.00", "2025-01-11", category=food)
    add_transaction(org, "contribution", "200.00", "2025-01-12", category=goal)
    add_transaction(org, "expense", "100.00", "2025-01-13", category=transport)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    categories = data["categories"]
    assert [(c["name"], c["type"], c["total"]) for c in categories] == [
        ("Salary", "income", "500.00"),
        ("Food", "expense", "300.00"),
        ("Contribution", "contribution", "200.00"),
        ("Transport", "expense", "100.00"),
    ]
    assert [c["category_id"] for c in categories] == [salary.pk, food.pk, goal.pk, transport.pk]


def test_category_share_percent_is_relative_to_type_total(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    food = Category.objects.create(org=org, name="Food", type="expense")
    transport = Category.objects.create(org=org, name="Transport", type="expense")
    add_transaction(org, "expense", "244.10", "2025-01-11", category=food)
    add_transaction(org, "expense", "755.90", "2025-01-12", category=transport)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    shares = {c["name"]: c["share_percent"] for c in data["categories"]}
    assert shares["Food"] == pytest.approx(24.41)
    assert shares["Transport"] == pytest.approx(75.59)


def test_uncategorized_bucket_per_entry_type(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    food = Category.objects.create(org=org, name="Food", type="expense")
    add_transaction(org, "income", "30.00", "2025-01-11")
    add_transaction(org, "expense", "10.00", "2025-01-12")
    add_transaction(org, "expense", "90.00", "2025-01-13", category=food)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    uncategorized = [c for c in data["categories"] if c["category_id"] is None]
    assert [(c["type"], c["total"]) for c in uncategorized] == [
        ("income", "30.00"),
        ("expense", "10.00"),
    ]
    assert all(c["name"] == "Uncategorized" for c in uncategorized)
    # invariant: category rows partition the yearly totals per type
    totals = data["totals"]
    for entry_type in ("income", "expense"):
        key = "expenses" if entry_type == "expense" else entry_type
        bucket = sum(Decimal(c["total"]) for c in data["categories"] if c["type"] == entry_type)
        assert bucket == Decimal(totals[key])


def test_deleted_category_rows_land_in_uncategorized(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    food = Category.objects.create(org=org, name="Food", type="expense")
    add_transaction(org, "expense", "42.00", "2025-01-11", category=food)
    food.delete()  # Transaction.category is SET_NULL

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    categories = data["categories"]
    assert len(categories) == 1
    assert categories[0]["category_id"] is None
    assert categories[0]["name"] == "Uncategorized"
    assert categories[0]["total"] == "42.00"


def test_report_excludes_other_organizations(
    report_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    other_org = Organization.objects.create(name="Other budget", initial_balance=Decimal("0"))
    add_transaction(other_org, "income", "9999.00", "2025-01-11")
    salary = Category.objects.create(org=org, name="Salary", type="income")
    add_transaction(org, "income", "10.00", "2025-01-11", category=salary)

    data = report_client.get(report_url(org.id), {"year": 2025}).json()

    assert data["totals"]["income"] == "10.00"
    assert [(c["name"], c["total"]) for c in data["categories"]] == [("Salary", "10.00")]
