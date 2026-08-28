from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Goal, Organization, Transaction, User

pytestmark = pytest.mark.django_db


def transactions_url(org_id: int) -> str:
    return reverse("transaction-list-create", kwargs={"org_id": org_id})


def transaction_url(org_id: int, transaction_id: int) -> str:
    return reverse(
        "transaction-get-delete",
        kwargs={"org_id": org_id, "transaction_id": transaction_id},
    )


def transaction_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "entry_type": "expense",
        "amount": "125.50",
        "description": "Groceries",
        "transaction_date": "2026-08-12",
        "is_tax_deductible": False,
        "goal_id": None,
        "category_id": None,
    }
    payload.update(overrides)
    return payload


def test_list_transactions_returns_all_organization_transactions(
    api_client: APIClient, owner: User, member: User, shared_org: Organization
) -> None:
    first = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    second = Transaction.objects.create(
        org=shared_org,
        created_by=member,
        entry_type="income",
        amount=Decimal("100.00"),
        transaction_date="2026-08-11",
    )

    api_client.force_authenticate(user=member)
    response = api_client.get(transactions_url(shared_org.id))

    assert response.status_code == 200
    assert {item["id"] for item in response.data["transactions"]} == {first.id, second.id}


def test_list_transactions_returns_empty_list(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.get(transactions_url(shared_org.id))

    assert response.status_code == 200
    assert response.data["transactions"] == []


def test_member_can_create_transaction_for_organization(
    api_client: APIClient, member: User, shared_org: Organization
) -> None:
    api_client.force_authenticate(user=member)

    response = api_client.post(
        transactions_url(shared_org.id), transaction_payload(), format="json"
    )

    assert response.status_code == 201
    transaction = Transaction.objects.get(id=response.data["id"])
    assert transaction.org_id == shared_org.id
    assert transaction.created_by_id == member.id
    assert response.data["amount"] == "125.50"
    assert response.data["created_by"] == member.username


def test_create_transaction_ignores_org_and_author_from_payload(
    api_client: APIClient, owner: User, member: User, shared_org: Organization
) -> None:
    api_client.force_authenticate(user=member)

    response = api_client.post(
        transactions_url(shared_org.id),
        transaction_payload(org_id=999999, created_by=owner.id),
        format="json",
    )

    assert response.status_code == 201
    transaction = Transaction.objects.get(id=response.data["id"])
    assert transaction.org_id == shared_org.id
    assert transaction.created_by_id == member.id


def test_create_transaction_rejects_goal_from_another_organization(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
    personal_org: Organization,
) -> None:
    goal = Goal.objects.create(
        org=personal_org,
        name="Emergency fund",
        target_amount=Decimal("1000.00"),
        target_date="2026-12-31",
    )
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(shared_org.id), transaction_payload(goal_id=goal.id), format="json"
    )

    assert response.status_code == 400

    assert not Transaction.objects.filter(org=shared_org).exists()


@pytest.mark.parametrize("method", ["get", "post"])
def test_transactions_require_organization_membership(
    api_client: APIClient, stranger: User, personal_org: Organization, method: str
) -> None:
    api_client.force_authenticate(user=stranger)
    if method == "post":
        response = api_client.post(
            transactions_url(personal_org.id), transaction_payload(), format="json"
        )
    else:
        response = api_client.get(transactions_url(personal_org.id))

    assert response.status_code == 403


def test_transactions_require_authentication(
    api_client: APIClient, shared_org: Organization
) -> None:
    response = api_client.get(transactions_url(shared_org.id))

    assert response.status_code == 403


def test_create_transaction_rejects_invalid_payload(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(shared_org.id), {"entry_type": "invalid"}, format="json"
    )

    assert response.status_code == 400


def test_member_can_delete_organization_transaction(
    api_client: APIClient, member: User, shared_org: Organization
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=member,
        entry_type="expense",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=member)

    response = api_client.delete(transaction_url(shared_org.id, transaction.id))

    assert response.status_code == 204
    assert not Transaction.objects.filter(id=transaction.id).exists()


def test_member_can_delete_income_when_balance_is_sufficient(
    api_client: APIClient, member: User, shared_org: Organization
) -> None:
    shared_org.initial_balance = Decimal("100.00")
    shared_org.save(update_fields=["initial_balance"])
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=member,
        entry_type="income",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=member)

    response = api_client.delete(transaction_url(shared_org.id, transaction.id))

    assert response.status_code == 204
    assert not Transaction.objects.filter(id=transaction.id).exists()


def test_member_cannot_delete_income_when_balance_is_insufficient(
    api_client: APIClient, member: User, shared_org: Organization
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=member,
        entry_type="income",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    Transaction.objects.create(
        org=shared_org,
        created_by=member,
        entry_type="expense",
        amount=Decimal("10.00"),
        transaction_date="2026-08-11",
    )
    api_client.force_authenticate(user=member)

    response = api_client.delete(transaction_url(shared_org.id, transaction.id))

    assert response.status_code == 400
    assert Transaction.objects.filter(id=transaction.id).exists()


def test_member_cannot_delete_transaction_from_another_organization(
    api_client: APIClient,
    member: User,
    shared_org: Organization,
    personal_org: Organization,
) -> None:
    transaction = Transaction.objects.create(
        org=personal_org,
        created_by=member,
        entry_type="expense",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=member)

    response = api_client.delete(transaction_url(shared_org.id, transaction.id))

    assert response.status_code == 404
    assert Transaction.objects.filter(id=transaction.id).exists()


def test_non_member_cannot_delete_transaction(
    api_client: APIClient,
    member: User,
    stranger: User,
    shared_org: Organization,
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=member,
        entry_type="expense",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=stranger)

    response = api_client.delete(transaction_url(shared_org.id, transaction.id))

    assert response.status_code == 403
    assert Transaction.objects.filter(id=transaction.id).exists()


def test_delete_transaction_requires_authentication(
    api_client: APIClient, shared_org: Organization
) -> None:
    response = api_client.delete(transaction_url(shared_org.id, 1))

    assert response.status_code == 403
