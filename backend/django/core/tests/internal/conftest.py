"""Shared fixtures for the internal AI endpoint tests; request helpers and
URL names live in helpers.py (fixtures are auto-discovered by pytest, the
rest is imported explicitly)."""

import pytest

from core.models import Category, Organization, User


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
    """Default two-category set; test_ai_categories.py overrides it with a richer one."""
    return {
        "salary": Category.objects.create(org=ai_org, name="Salary", type="income"),
        "food": Category.objects.create(org=ai_org, name="Food", type="expense"),
    }
