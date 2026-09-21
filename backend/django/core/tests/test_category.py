import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Category, CategoryType, Organization, User

pytestmark = pytest.mark.django_db


def categories_url(org_id: int) -> str:
    return reverse("category-list-create", kwargs={"org_id": org_id})


def category_url(org_id: int, category_id: int) -> str:
    return reverse(
        "category-detail",
        kwargs={"org_id": org_id, "category_id": category_id},
    )


def test_list_categories_returns_categories_for_organization(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
    personal_org: Organization,
) -> None:
    income = Category.objects.create(org=shared_org, name="Salary", type=CategoryType.INCOME)
    expense = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
    foreign = Category.objects.create(org=personal_org, name="Rent", type=CategoryType.EXPENSE)
    api_client.force_authenticate(user=owner)

    response = api_client.get(categories_url(shared_org.id))

    assert response.status_code == 200
    assert response.data["categories"] == [
        {"id": income.id, "org": shared_org.id, "name": "Salary", "type": "income"},
        {"id": expense.id, "org": shared_org.id, "name": "Food", "type": "expense"},
    ]
    assert foreign.id not in {item["id"] for item in response.data["categories"]}


def test_list_categories_filters_by_type(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    income = Category.objects.create(org=shared_org, name="Salary", type=CategoryType.INCOME)
    expense = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
    api_client.force_authenticate(user=owner)

    response = api_client.get(
        categories_url(shared_org.id),
        {"type": CategoryType.EXPENSE},
    )

    assert response.status_code == 200
    assert response.data["categories"] == [
        {"id": expense.id, "org": shared_org.id, "name": "Food", "type": "expense"}
    ]
    assert income.id not in {item["id"] for item in response.data["categories"]}


def test_list_categories_rejects_invalid_type(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
) -> None:
    api_client.force_authenticate(user=owner)

    response = api_client.get(categories_url(shared_org.id), {"type": "invalid"})

    assert response.status_code == 200
    assert response.data == {"categories": []}


# def test_member_can_create_category(
#     api_client: APIClient, member: User, shared_org: Organization
# ) -> None:
#     api_client.force_authenticate(user=member)

#     response = api_client.post(
#         categories_url(shared_org.id),
#         {"name": "Food", "type": CategoryType.EXPENSE},
#         format="json",
#     )

#     assert response.status_code == 201
#     category = Category.objects.get(id=response.data["id"])
#     assert category.org_id == shared_org.id
#     assert response.data == {
#         "id": category.id,
#         "org": shared_org.id,
#         "name": "Food",
#         "type": CategoryType.EXPENSE,
#     }


# def test_create_category_rejects_duplicate_name_and_type(
#     api_client: APIClient, owner: User, shared_org: Organization
# ) -> None:
#     Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
#     api_client.force_authenticate(user=owner)

#     response = api_client.post(
#         categories_url(shared_org.id),
#         {"name": "Food", "type": CategoryType.EXPENSE},
#         format="json",
#     )

#     assert response.status_code == 400
#     assert response.data["name"] == ["This category already exists in this organization."]


def test_member_can_retrieve_category(
    api_client: APIClient, member: User, shared_org: Organization
) -> None:
    category = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
    api_client.force_authenticate(user=member)

    response = api_client.get(category_url(shared_org.id, category.id))

    assert response.status_code == 200
    assert response.data["category"] == {
        "id": category.id,
        "org": shared_org.id,
        "name": "Food",
        "type": CategoryType.EXPENSE,
    }


def test_category_detail_does_not_cross_organization_boundary(
    api_client: APIClient,
    owner: User,
    shared_org: Organization,
    personal_org: Organization,
) -> None:
    category = Category.objects.create(org=personal_org, name="Private", type=CategoryType.EXPENSE)
    api_client.force_authenticate(user=owner)

    response = api_client.get(category_url(shared_org.id, category.id))

    assert response.status_code == 404


# def test_member_can_update_category(
#     api_client: APIClient, member: User, shared_org: Organization
# ) -> None:
#     category = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
#     api_client.force_authenticate(user=member)

#     response = api_client.patch(
#         category_url(shared_org.id, category.id),
#         {"name": "Groceries", "type": CategoryType.CONTRIBUTION},
#         format="json",
#     )

#     assert response.status_code == 200
#     category.refresh_from_db()
#     assert category.name == "Groceries"
#     assert category.type == CategoryType.CONTRIBUTION
#     assert response.data["category"]["name"] == "Groceries"


# def test_update_category_rejects_duplicate_name_and_type(
#     api_client: APIClient,
#     owner: User,
#     shared_org: Organization,
# ) -> None:
#     category = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
#     duplicate = Category.objects.create(
#         org=shared_org,
#         name="Groceries",
#         type=CategoryType.EXPENSE,
#     )
#     api_client.force_authenticate(user=owner)

#     response = api_client.patch(
#         category_url(shared_org.id, category.id),
#         {"name": duplicate.name, "type": duplicate.type},
#         format="json",
#     )

#     assert response.status_code == 400
#     category.refresh_from_db()
#     assert category.name == "Food"
#     assert category.type == CategoryType.EXPENSE


# @pytest.mark.parametrize("payload", [{}, {"name": ""}, {"type": "invalid"}])
# def test_update_category_rejects_invalid_payload(
#     api_client: APIClient,
#     owner: User,
#     shared_org: Organization,
#     payload: dict[str, str],
# ) -> None:
#     category = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
#     api_client.force_authenticate(user=owner)

#     response = api_client.patch(category_url(shared_org.id, category.id), payload, format="json")

#     assert response.status_code == 400


# def test_member_can_delete_category_and_transactions_keep_their_data(
#     api_client: APIClient, member: User, shared_org: Organization
# ) -> None:
#     category = Category.objects.create(org=shared_org, name="Food", type=CategoryType.EXPENSE)
#     transaction = Transaction.objects.create(
#         org=shared_org,
#         category=category,
#         created_by=member,
#         entry_type="expense",
#         amount="25.00",
#         transaction_date="2026-08-10",
#     )
#     api_client.force_authenticate(user=member)

#     response = api_client.delete(category_url(shared_org.id, category.id))

#     assert response.status_code == 204
#     assert not Category.objects.filter(id=category.id).exists()
#     transaction.refresh_from_db()
#     assert transaction.category_id is None


# @pytest.mark.parametrize("method", ["get", "post"])
# def test_category_collection_requires_organization_membership(
#     api_client: APIClient, stranger: User, shared_org: Organization, method: str
# ) -> None:
#     api_client.force_authenticate(user=stranger)
#     if method == "get":
#         response = api_client.get(categories_url(shared_org.id))
#     else:
#         response = api_client.post(
#             categories_url(shared_org.id),
#             {"name": "Food", "type": CategoryType.EXPENSE},
#             format="json",
#         )

#     assert response.status_code == 403


def test_category_detail_requires_authentication(
    api_client: APIClient, shared_org: Organization
) -> None:
    response = api_client.get(category_url(shared_org.id, 1))

    assert response.status_code == 403
