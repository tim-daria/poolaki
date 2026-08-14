import json

import pytest
from django.test import Client

from core.models import User

LOGIN_URL = "/_allauth/browser/v1/auth/login"


def login_error_codes(client: Client, payload: dict[str, str]) -> list[str]:
    response = client.post(
        LOGIN_URL,
        data=json.dumps(payload),
        content_type="application/json",
    )
    return [error.get("code") for error in response.json().get("errors", [])]


@pytest.fixture
def alice() -> User:
    return User.objects.create_user(
        username="alice", email="alice@example.com", password="s3cret-pass"
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "payload",
    [
        {"username": "nobody", "password": "whatever"},
        {"email": "nobody@example.com", "password": "whatever"},
    ],
)
def test_unknown_account_reports_user_not_found(
    client: Client, alice: User, payload: dict[str, str]
) -> None:
    assert "user_not_found" in login_error_codes(client, payload)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("payload", "code"),
    [
        ({"username": "alice", "password": "wrong"}, "username_password_mismatch"),
        (
            {"email": "alice@example.com", "password": "wrong"},
            "email_password_mismatch",
        ),
    ],
)
def test_wrong_password_reports_mismatch(
    client: Client, alice: User, payload: dict[str, str], code: str
) -> None:
    assert code in login_error_codes(client, payload)


@pytest.mark.django_db
def test_valid_credentials_still_log_in(client: Client, alice: User) -> None:
    response = client.post(
        LOGIN_URL,
        data=json.dumps({"username": "alice", "password": "s3cret-pass"}),
        content_type="application/json",
    )
    assert response.status_code == 200
