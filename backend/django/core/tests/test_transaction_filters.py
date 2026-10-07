"""Server-side filtering and pagination of the transaction list endpoint."""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import (
    Category,
    CategoryType,
    Goal,
    Organization,
    Transaction,
    User,
)

pytestmark = pytest.mark.django_db


def transactions_url(org_id: int) -> str:
    return reverse("transaction-list-create", kwargs={"org_id": org_id})


def make_transaction(org: Organization, **fields: object) -> Transaction:
    defaults: dict[str, object] = {
        "org": org,
        "entry_type": "expense",
        "amount": Decimal("10.00"),
        "transaction_date": "2026-08-10",
    }
    defaults.update(fields)
    return Transaction.objects.create(**defaults)


def make_goal(org: Organization) -> Goal:
    return Goal.objects.create(
        org=org,
        name="Trip",
        target_amount=Decimal("1000.00"),
        target_date="2026-12-31",
    )


def test_list_transactions_returns_paged_envelope(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    make_transaction(shared_org, entry_type="expense")
    make_transaction(shared_org, entry_type="income")
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id))

    assert response.status_code == 200
    assert set(response.data) == {
        "transactions",
        "total",
        "page",
        "page_size",
        "page_count",
        "counts",
    }
    assert response.data["total"] == 2
    assert response.data["page"] == 1
    assert response.data["page_size"] == 15
    assert response.data["page_count"] == 1
    assert response.data["counts"] == {
        "all": 2,
        "income": 1,
        "expense": 1,
        "contribution": 0,
    }


def test_list_transactions_filters_by_entry_type(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    expense = make_transaction(shared_org, entry_type="expense")
    make_transaction(shared_org, entry_type="income")
    make_transaction(shared_org, entry_type="contribution")
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), {"entry_type": "expense"})

    assert [item["id"] for item in response.data["transactions"]] == [expense.id]
    assert response.data["total"] == 1
    # Counts ignore the tab itself, so the other tabs stay populated.
    assert response.data["counts"] == {
        "all": 3,
        "income": 1,
        "expense": 1,
        "contribution": 1,
    }


def test_list_transactions_filters_by_inclusive_date_range(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    first_of_range = make_transaction(shared_org, transaction_date="2026-08-01")
    last_of_range = make_transaction(shared_org, transaction_date="2026-08-31")
    make_transaction(shared_org, transaction_date="2026-07-31")
    make_transaction(shared_org, transaction_date="2026-09-01")
    api_client.force_authenticate(user=owner)

    response = api_client.get(
        transactions_url(shared_org.id),
        {"date_from": "2026-08-01", "date_to": "2026-08-31"},
    )

    assert {item["id"] for item in response.data["transactions"]} == {
        first_of_range.id,
        last_of_range.id,
    }
    assert response.data["total"] == 2


def test_list_transactions_filters_by_category_id(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    # A category's type pins its rows to one entry type, so each category
    # fixture pairs with rows of the matching type.
    food = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
    salary = Category.objects.create(org=shared_org, name="Salary", type=CategoryType.INCOME)
    food_a = make_transaction(shared_org, category=food, entry_type="expense")
    food_b = make_transaction(shared_org, category=food, entry_type="expense")
    make_transaction(shared_org, category=salary, entry_type="income")
    make_transaction(shared_org, entry_type="expense")
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), {"category_id": food.id})

    assert {item["id"] for item in response.data["transactions"]} == {food_a.id, food_b.id}
    assert response.data["total"] == 2
    # Tab counts respect the selected category.
    assert response.data["counts"] == {
        "all": 2,
        "income": 0,
        "expense": 2,
        "contribution": 0,
    }


def test_list_transactions_filters_by_multiple_category_ids(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    food = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
    rent = Category.objects.create(org=shared_org, name="Rent", type=CategoryType.EXPENSE)
    salary = Category.objects.create(org=shared_org, name="Salary", type=CategoryType.INCOME)
    food_row = make_transaction(shared_org, category=food, entry_type="expense")
    rent_row = make_transaction(shared_org, category=rent, entry_type="expense")
    make_transaction(shared_org, category=salary, entry_type="income")
    make_transaction(shared_org, entry_type="expense")
    api_client.force_authenticate(user=owner)

    # OR semantics: rows of any listed category come back; the unlisted
    # category and rows without one do not.
    response = api_client.get(
        transactions_url(shared_org.id),
        {"category_id": f"{food.id},{rent.id}"},
    )

    assert {item["id"] for item in response.data["transactions"]} == {
        food_row.id,
        rent_row.id,
    }
    assert response.data["total"] == 2
    assert response.data["counts"] == {
        "all": 2,
        "income": 0,
        "expense": 2,
        "contribution": 0,
    }


def test_list_transactions_filters_by_goal_id(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = make_goal(shared_org)
    saved = make_transaction(shared_org, entry_type="contribution", goal=goal)
    spent = make_transaction(shared_org, entry_type="expense", goal=goal)
    make_transaction(shared_org, entry_type="expense")
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), {"goal_id": goal.id})

    # Both entry types linked to the goal come back; unlinked rows do not.
    assert response.data["total"] == 2
    assert {item["id"] for item in response.data["transactions"]} == {saved.id, spent.id}


def test_list_transactions_filters_by_tax_deductible(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    deductible = make_transaction(shared_org, is_tax_deductible=True)
    make_transaction(shared_org)
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), {"tax_deductible": "true"})

    assert [item["id"] for item in response.data["transactions"]] == [deductible.id]


def test_list_transactions_sorts_oldest_first_with_id_tie_break(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    later = make_transaction(shared_org, transaction_date="2026-08-11")
    same_day_first = make_transaction(shared_org, transaction_date="2026-08-10")
    same_day_second = make_transaction(shared_org, transaction_date="2026-08-10")
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), {"sort": "oldest"})

    assert [item["id"] for item in response.data["transactions"]] == [
        same_day_first.id,
        same_day_second.id,
        later.id,
    ]


def test_list_transactions_paginates(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    for i in range(20):
        make_transaction(shared_org, transaction_date=f"2026-08-{i + 1:02d}")
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id))
    assert response.data["total"] == 20
    assert response.data["page_count"] == 2
    assert len(response.data["transactions"]) == 15
    # Newest first by default: the latest date leads page one.
    assert response.data["transactions"][0]["transaction_date"] == "2026-08-20"

    page_two = api_client.get(transactions_url(shared_org.id), {"page": 2})
    assert len(page_two.data["transactions"]) == 5
    assert page_two.data["transactions"][0]["transaction_date"] == "2026-08-05"

    # A page past the last one is an empty page, not an error.
    past_end = api_client.get(transactions_url(shared_org.id), {"page": 3})
    assert past_end.data["transactions"] == []
    assert past_end.data["total"] == 20

    sized = api_client.get(transactions_url(shared_org.id), {"page_size": 5})
    assert sized.data["page_size"] == 5
    assert sized.data["page_count"] == 4


def test_list_transaction_counts_respect_other_filters(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    make_transaction(shared_org, entry_type="expense", transaction_date="2026-08-01")
    make_transaction(shared_org, entry_type="income", transaction_date="2026-08-01")
    make_transaction(shared_org, entry_type="income", transaction_date="2026-09-01")
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), {"date_to": "2026-08-31"})

    assert response.data["counts"] == {
        "all": 2,
        "income": 1,
        "expense": 1,
        "contribution": 0,
    }


@pytest.mark.parametrize(
    "params",
    [
        {"entry_type": "transfer"},
        {"sort": "latest"},
        {"date_from": "not-a-date"},
        {"page": "0"},
        {"page_size": "101"},
        {"category_id": "abc"},
        {"category_id": "1,abc"},
        {"category_id": "0"},
        {"date_from": "2026-08-10", "date_to": "2026-08-01"},
    ],
)
def test_list_transactions_rejects_malformed_params(
    api_client: APIClient, owner: User, shared_org: Organization, params: dict[str, str]
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), params)

    assert response.status_code == 400


def test_list_transactions_rejects_goal_from_another_organization(
    api_client: APIClient, owner: User, shared_org: Organization, personal_org: Organization
) -> None:
    goal = make_goal(personal_org)
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), {"goal_id": goal.id})

    assert response.status_code == 400
    assert response.data["goal_id"] == ["Goal does not belong to this organization."]


def test_list_transactions_rejects_category_from_another_organization(
    api_client: APIClient, owner: User, shared_org: Organization, personal_org: Organization
) -> None:
    category = Category.objects.create(org=personal_org, name="Private", type=CategoryType.EXPENSE)
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id), {"category_id": category.id})

    assert response.status_code == 400
    assert response.data["category_id"] == ["Category does not belong to this organization."]


def test_list_transactions_rejects_category_list_with_foreign_category(
    api_client: APIClient, owner: User, shared_org: Organization, personal_org: Organization
) -> None:
    own = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
    foreign = Category.objects.create(org=personal_org, name="Private", type=CategoryType.EXPENSE)
    api_client.force_authenticate(user=owner)

    response = api_client.get(
        transactions_url(shared_org.id), {"category_id": f"{own.id},{foreign.id}"}
    )

    assert response.status_code == 400
    assert response.data["category_id"] == ["Category does not belong to this organization."]
