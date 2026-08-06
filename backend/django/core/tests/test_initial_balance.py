from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Organization, User


@pytest.mark.django_db
def test_set_initial_balance_success(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    user, org = personal_user
    api_client.force_authenticate(user)

    response = api_client.post(
        reverse("set_initial_balance"),
        {"initial_balance": "1500.50"},
        format="json",
    )

    assert response.status_code == 200

    org.refresh_from_db()

    assert org.initial_balance == Decimal("1500.50")
    assert response.json() == {
        "initial_balance": "1500.50",
    }


@pytest.mark.django_db
def test_set_initial_balance_rejects_invalid_value(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, _ = personal_user
    api_client.force_authenticate(user)

    response = api_client.post(
        reverse("set_initial_balance"),
        {"initial_balance": "not-a-number"},
        format="json",
    )

    assert response.status_code == 400
    assert "initial_balance" in response.json()


@pytest.mark.django_db
def test_set_initial_balance_rejects_big_value(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, _ = personal_user
    api_client.force_authenticate(user)

    response = api_client.post(
        reverse("set_initial_balance"),
        {"initial_balance": "1234567891234567"},
        format="json",
    )

    assert response.status_code == 400
    assert "initial_balance" in response.json()


@pytest.mark.django_db
def test_set_initial_balance_clears_session_flag(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, _ = personal_user

    session = api_client.session
    session["needs_initial_balance"] = True
    session.save()

    api_client.force_authenticate(user)

    response = api_client.post(
        reverse("set_initial_balance"),
        {"initial_balance": "100"},
        format="json",
    )

    assert response.status_code == 200

    session = api_client.session
    assert "needs_initial_balance" not in session


@pytest.mark.django_db
def test_get_initial_balance_flag(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    user, _ = personal_user

    session = api_client.session
    session["needs_initial_balance"] = True
    session.save()

    api_client.force_authenticate(user)

    response = api_client.get(reverse("set_initial_balance"))

    assert response.status_code == 200
    assert response.json() == {
        "needs_initial_balance": True,
    }


@pytest.mark.django_db
def test_get_initial_balance_flag_defaults_to_false(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
) -> None:
    user, _ = personal_user
    api_client.force_authenticate(user)

    response = api_client.get(reverse("set_initial_balance"))

    assert response.status_code == 200
    assert response.json() == {
        "needs_initial_balance": False,
    }
