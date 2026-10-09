from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import (
    Category,
    CategoryType,
    Goal,
    Membership,
    Notification,
    NotificationType,
    Organization,
    Role,
    Transaction,
    User,
)

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

def test_list_transactions_search_matches_description_case_insensitively(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    rewe = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        description="REWE",
        transaction_date="2026-08-10",
    )
    Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("40.00"),
        description="Edeka",
        transaction_date="2026-08-11",
    )

    api_client.force_authenticate(user=owner)
    response = api_client.get(transactions_url(shared_org.id), {"q": "rew"})

    assert response.status_code == 200
    assert [item["id"] for item in response.data["transactions"]] == [rewe.id]
    # Search narrows the tab counts too: it applies before the entry_type split.
    assert response.data["counts"]["all"] == 1
    assert response.data["total"] == 1


def test_list_transactions_search_matches_category_name(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    groceries = Category.objects.create(name="Groceries", type=CategoryType.EXPENSE)
    eating_out = Category.objects.create(name="Eating out", type=CategoryType.EXPENSE)
    in_groceries = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        description="Weekly shop",
        category=groceries,
        transaction_date="2026-08-10",
    )
    Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("18.00"),
        description="Pizza",
        category=eating_out,
        transaction_date="2026-08-11",
    )

    api_client.force_authenticate(user=owner)
    response = api_client.get(transactions_url(shared_org.id), {"q": "grocer"})

    assert response.status_code == 200
    assert [item["id"] for item in response.data["transactions"]] == [in_groceries.id]

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
    assert response.data["goal_id"] == ["Goal does not belong to this organization."]

    assert not Transaction.objects.filter(org=shared_org).exists()


def test_create_transaction_accepts_goal_on_expense(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Trip",
        target_amount=Decimal("1000.00"),
        target_date="2026-12-31",
    )
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(shared_org.id), transaction_payload(goal_id=goal.id), format="json"
    )

    assert response.status_code == 201
    assert Transaction.objects.get(id=response.data["id"]).goal_id == goal.id


def test_create_transaction_rejects_goal_on_income(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    goal = Goal.objects.create(
        org=shared_org,
        name="Trip",
        target_amount=Decimal("1000.00"),
        target_date="2026-12-31",
    )
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(shared_org.id),
        transaction_payload(entry_type="income", goal_id=goal.id),
        format="json",
    )

    assert response.status_code == 400
    assert response.data["goal_id"] == ["Goal cannot be set on an income transaction."]
    assert not Transaction.objects.filter(org=shared_org).exists()


def test_create_transaction_rejects_category_from_another_organization(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
    personal_org: Organization,
) -> None:
    category = Category.objects.create(
        org=personal_org,
        name="Private",
        type=CategoryType.EXPENSE,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(shared_org.id),
        transaction_payload(category_id=category.id),
        format="json",
    )

    assert response.status_code == 400
    assert response.data["category_id"] == ["Category does not belong to this organization."]
    assert not Transaction.objects.filter(org=shared_org).exists()


def test_create_transaction_accepts_category_matching_entry_type(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    category = Category.objects.create(
        org=shared_org,
        name="Groceries",
        type=CategoryType.EXPENSE,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(shared_org.id),
        transaction_payload(category_id=category.id),
        format="json",
    )

    assert response.status_code == 201
    transaction = Transaction.objects.get(id=response.data["id"])
    assert transaction.category_id == category.id


def test_create_transaction_rejects_category_with_different_type(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    category = Category.objects.create(
        org=shared_org,
        name="Salary",
        type=CategoryType.INCOME,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(shared_org.id),
        transaction_payload(category_id=category.id),
        format="json",
    )

    assert response.status_code == 400
    assert response.data["category_id"] == ["Category type must match transaction entry type."]
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


def test_create_transaction_notifies_all_members_except_creator(
    api_client: APIClient,
    owner: User,
    member: User,
    invitee: User,
    shared_org: Organization,
) -> None:
    Membership.objects.create(user=invitee, org=shared_org, role=Role.MEMBER)
    api_client.force_authenticate(user=member)

    response = api_client.post(
        transactions_url(shared_org.id), transaction_payload(), format="json"
    )

    assert response.status_code == 201
    txn = Transaction.objects.get(id=response.data["id"])

    assert set(Notification.objects.values_list("user_id", flat=True)) == {owner.id, invitee.id}
    notification = Notification.objects.get(user=owner)
    assert notification.type == NotificationType.TRANSACTION_ADDED
    assert notification.org_id == shared_org.id
    assert notification.is_read is False
    assert notification.payload == {
        "org_name": shared_org.name,
        "added_by": member.username,
        "transaction_id": txn.id,
        "amount": "125.50",
        "entry_type": "expense",
    }


def test_create_transaction_in_personal_budget_creates_no_notifications(
    api_client: APIClient, owner: User, personal_org: Organization
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(personal_org.id), transaction_payload(), format="json"
    )

    assert response.status_code == 201
    assert not Notification.objects.exists()


def test_create_transaction_rejects_negative_amount(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.post(
        transactions_url(shared_org.id),
        transaction_payload(amount="-25"),
        format="json",
    )

    assert response.status_code == 400
    assert response.data["amount"] == ["Ensure this value is greater than or equal to 0.01."]
    assert not Transaction.objects.filter(org=shared_org).exists()


def test_transaction_creator_can_partially_update_transaction(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        description="Original description",
        transaction_date="2026-08-10",
        is_tax_deductible=True,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        transaction_url(shared_org.id, transaction.id),
        {
            "amount": "0.01",
            "description": "",
            "transaction_date": "2026-08-12",
            "is_tax_deductible": False,
        },
        format="json",
    )

    assert response.status_code == 200
    transaction.refresh_from_db()
    assert transaction.amount == Decimal("0.01")
    assert transaction.description == ""
    assert str(transaction.transaction_date) == "2026-08-12"
    assert transaction.is_tax_deductible is False


def test_transaction_patch_preserves_omitted_fields(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        description="Original description",
        transaction_date="2026-08-10",
        is_tax_deductible=True,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        transaction_url(shared_org.id, transaction.id),
        {"description": "Updated description"},
        format="json",
    )

    assert response.status_code == 200
    transaction.refresh_from_db()
    assert transaction.amount == Decimal("25.00")
    assert transaction.description == "Updated description"
    assert str(transaction.transaction_date) == "2026-08-10"
    assert transaction.is_tax_deductible is True


def test_transaction_creator_can_clear_nullable_description(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        description="Original description",
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        transaction_url(shared_org.id, transaction.id),
        {"description": None},
        format="json",
    )

    assert response.status_code == 200
    transaction.refresh_from_db()
    assert transaction.description is None


def test_transaction_patch_rejects_category_from_another_organization(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
    personal_org: Organization,
) -> None:
    category = Category.objects.create(
        org=personal_org,
        name="Private",
        type=CategoryType.EXPENSE,
    )
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        transaction_url(shared_org.id, transaction.id),
        {"category_id": category.id},
        format="json",
    )

    assert response.status_code == 400
    assert response.data["category_id"] == ["Category does not belong to this organization."]
    transaction.refresh_from_db()
    assert transaction.category_id is None


def test_transaction_patch_accepts_category_matching_entry_type(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    category = Category.objects.create(
        org=shared_org,
        name="Groceries",
        type=CategoryType.EXPENSE,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        transaction_url(shared_org.id, transaction.id),
        {"category_id": category.id},
        format="json",
    )

    assert response.status_code == 200
    transaction.refresh_from_db()
    assert transaction.category_id == category.id


def test_transaction_patch_rejects_category_with_different_type(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        transaction_date="2026-08-10",
    )
    category = Category.objects.create(
        org=shared_org,
        name="Salary",
        type=CategoryType.INCOME,
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        transaction_url(shared_org.id, transaction.id),
        {"category_id": category.id},
        format="json",
    )

    assert response.status_code == 400
    assert response.data["category_id"] == ["Category type must match transaction entry type."]
    transaction.refresh_from_db()
    assert transaction.category_id is None


def test_non_creator_cannot_patch_transaction(
    api_client: APIClient, owner: User, member: User, shared_org: Organization
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        description="Original description",
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=member)

    response = api_client.patch(
        transaction_url(shared_org.id, transaction.id),
        {"description": "Unauthorized update"},
        format="json",
    )

    assert response.status_code == 404
    transaction.refresh_from_db()
    assert transaction.description == "Original description"


def test_transaction_patch_rejects_negative_amount(
    api_client: APIClient, owner: User, shared_org: Organization
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        description="Original description",
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=owner)

    response = api_client.patch(
        transaction_url(shared_org.id, transaction.id),
        {"amount": "-1"},
        format="json",
    )

    assert response.status_code == 400
    transaction.refresh_from_db()
    assert transaction.description == "Original description"


def test_non_creator_cannot_delete_transaction(
    api_client: APIClient, owner: User, member: User, shared_org: Organization
) -> None:
    transaction = Transaction.objects.create(
        org=shared_org,
        created_by=owner,
        entry_type="expense",
        amount=Decimal("25.00"),
        description="Original description",
        transaction_date="2026-08-10",
    )
    api_client.force_authenticate(user=member)

    response = api_client.delete(transaction_url(shared_org.id, transaction.id))

    assert response.status_code == 404
    transaction.refresh_from_db()
    assert transaction.description == "Original description"


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


# def test_member_cannot_delete_income_when_balance_is_insufficient(
#     api_client: APIClient, member: User, shared_org: Organization
# ) -> None:
#     transaction = Transaction.objects.create(
#         org=shared_org,
#         created_by=member,
#         entry_type="income",
#         amount=Decimal("25.00"),
#         transaction_date="2026-08-10",
#     )
#     Transaction.objects.create(
#         org=shared_org,
#         created_by=member,
#         entry_type="expense",
#         amount=Decimal("10.00"),
#         transaction_date="2026-08-11",
#     )
#     api_client.force_authenticate(user=member)

#     response = api_client.delete(transaction_url(shared_org.id, transaction.id))

#     assert response.status_code == 400
#     assert Transaction.objects.filter(id=transaction.id).exists()


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
