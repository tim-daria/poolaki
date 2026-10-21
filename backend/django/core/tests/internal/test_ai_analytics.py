from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Category, Goal, Organization, User
from core.tests.internal.helpers import AI_ANALYTICS_URL, add_transaction, post_ai_endpoint

pytestmark = pytest.mark.django_db


# ------------------------------------ #
#            Response shape            #
# ------------------------------------ #


def test_response_carry_contract_shape(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    add_transaction(ai_org, "income", "100.00", "2025-06-15", ai_categories["salary"])

    data = post_ai_endpoint(api_client, AI_ANALYTICS_URL, ai_user, ai_org, year=2025).json()

    assert set(data) == {"year", "balance", "totals", "months"}
    assert data["year"] == 2025
    assert data["totals"] == {
        "income": "100.00",
        "expense": "0.00",
        "contribution": "0.00",
        "withdraw": "0.00",
    }
    assert [m["month"] for m in data["months"]] == list(range(1, 13))
    assert set(data["months"][0]) == {
        "month",
        "income",
        "expense",
        "contribution",
        "withdraw",
    }
    # months without activity are zero-filled
    assert data["months"][0] == {
        "month": 1,
        "income": "0.00",
        "expense": "0.00",
        "contribution": "0.00",
        "withdraw": "0.00",
    }
    june = next(m for m in data["months"] if m["month"] == 6)
    assert june == {
        "month": 6,
        "income": "100.00",
        "expense": "0.00",
        "contribution": "0.00",
        "withdraw": "0.00",
    }


def test_default_year_is_current_year(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    year = timezone.now().year
    add_transaction(ai_org, "income", "100.00", f"{year}-06-15", ai_categories["salary"])

    data = post_ai_endpoint(api_client, AI_ANALYTICS_URL, ai_user, ai_org).json()

    assert data["year"] == year
    assert data["totals"]["income"] == "100.00"


# ------------------------------------ #
#             Year filter              #
# ------------------------------------ #


def test_year_filter_scopes_totals_and_months(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    add_transaction(ai_org, "income", "100.00", "2024-03-10", ai_categories["salary"])
    add_transaction(ai_org, "income", "50.00", "2025-03-10", ai_categories["salary"])

    data = post_ai_endpoint(api_client, AI_ANALYTICS_URL, ai_user, ai_org, year=2025).json()

    assert data["year"] == 2025
    assert data["totals"]["income"] == "50.00"
    march = next(m for m in data["months"] if m["month"] == 3)
    assert march["income"] == "50.00"


# ------------------------------------ #
#               Balance                #
# ------------------------------------ #


def test_balance_covers_full_history_regardless_of_year(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    # balance is the only section that ignores the year parameter:
    # initial_balance + all-time income - expense
    add_transaction(ai_org, "income", "1000.00", "2024-03-10", ai_categories["salary"])
    add_transaction(ai_org, "expense", "100.00", "2025-03-10", ai_categories["food"])

    data = post_ai_endpoint(api_client, AI_ANALYTICS_URL, ai_user, ai_org, year=2025).json()

    assert data["balance"] == "900.00"
    # while the year-scoped sections only see 2025
    assert data["totals"]["income"] == "0.00"
    assert data["totals"]["expense"] == "100.00"


def test_goal_transfers_excluded_from_report_sections(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    vacation = Goal.objects.create(org=ai_org, name="Vacation", target_amount=Decimal("3000.00"))
    add_transaction(ai_org, "contribution", "250.00", "2025-02-07", goal=vacation)
    add_transaction(ai_org, "income", "100.00", "2025-02-07", ai_categories["salary"])

    data = post_ai_endpoint(api_client, AI_ANALYTICS_URL, ai_user, ai_org, year=2025).json()

    assert data["totals"]["income"] == "100.00"
    assert data["totals"]["expense"] == "0.00"
    assert data["months"][1]["income"] == "100.00"


def test_other_orgs_data_excluded(
    api_client: APIClient, ai_user: User, ai_org: Organization, ai_categories: dict[str, Category]
) -> None:
    other_org = Organization.objects.create(
        name="Other budget", initial_balance=Decimal("12345.00")
    )
    other_salary = Category.objects.create(org=other_org, name="Salary", type="income")
    add_transaction(other_org, "income", "9999.00", "2025-01-11", other_salary)
    add_transaction(ai_org, "income", "10.00", "2025-01-11", ai_categories["salary"])

    data = post_ai_endpoint(api_client, AI_ANALYTICS_URL, ai_user, ai_org, year=2025).json()

    assert data["totals"]["income"] == "10.00"
    assert data["balance"] == "10.00"
