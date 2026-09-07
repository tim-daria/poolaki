import pytest

from core.models import Category, CategoryType, Organization
from core.services.category import create_default_categories

pytestmark = pytest.mark.django_db


def test_create_default_categories_creates_expected_categories(
    shared_org: Organization,
) -> None:
    create_default_categories(shared_org)

    assert list(Category.objects.filter(org=shared_org).values_list("name", "type")) == [
        ("Food", CategoryType.EXPENSE),
        ("Transport", CategoryType.EXPENSE),
        ("Housing", CategoryType.EXPENSE),
        ("Entertainment", CategoryType.EXPENSE),
        ("Shopping", CategoryType.EXPENSE),
        ("Health", CategoryType.EXPENSE),
        ("Utilities", CategoryType.EXPENSE),
        ("Salary", CategoryType.INCOME),
        ("Freelance", CategoryType.INCOME),
        ("Contribution", CategoryType.CONTRIBUTION),
    ]


def test_create_default_categories_only_adds_categories_to_given_organization(
    shared_org: Organization,
    personal_org: Organization,
) -> None:
    create_default_categories(shared_org)

    assert Category.objects.filter(org=shared_org).count() == 10
    assert not Category.objects.filter(org=personal_org).exists()
