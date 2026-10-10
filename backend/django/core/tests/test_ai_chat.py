from unittest import mock

import pytest
import requests
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from core.models import Organization, User

pytestmark = pytest.mark.django_db


class FakeAiResponse:
    def __init__(self, status_code: int, payload: object | None) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        if self._payload is None:
            raise ValueError("no json body")
        return self._payload


def ai_ok(answer: str = "ok", intent: str = "small_talk") -> FakeAiResponse:
    return FakeAiResponse(200, {"answer": answer, "metadata": {"intent": intent}})


def chat_url(org_id: int) -> str:
    return reverse("ai-chat", kwargs={"org_id": org_id})


def test_chat_requires_authentication(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    _, org = personal_user
    response = api_client.post(chat_url(org.id), {"question": "hi"}, format="json")
    assert response.status_code == 403


def test_chat_forbids_non_members(
    api_client: APIClient, personal_user: tuple[User, Organization], member: User
) -> None:
    _, org = personal_user
    api_client.force_authenticate(user=member)
    response = api_client.post(chat_url(org.id), {"question": "hi"}, format="json")
    assert response.status_code == 403


def test_chat_forwards_user_context_and_returns_answer(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    user, org = personal_user
    fake = ai_ok(answer="You spent 120 on Food.", intent="spending_analysis")
    with mock.patch("core.services.ai_chat.requests.post", return_value=fake) as post:
        api_client.force_authenticate(user=user)
        response = api_client.post(
            chat_url(org.id), {"question": "Why did I spend so much?"}, format="json"
        )

    assert response.status_code == 200
    assert response.data == {
        "answer": "You spent 120 on Food.",
        "metadata": {"intent": "spending_analysis"},
    }
    args, kwargs = post.call_args
    assert args[0] == "http://ai-service:8000/api/v1/chat"
    assert kwargs["json"] == {
        "user_id": user.id,
        "organization_id": org.id,
        "question": "Why did I spend so much?",
    }


def test_chat_rejects_empty_question(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    user, org = personal_user
    api_client.force_authenticate(user=user)
    response = api_client.post(chat_url(org.id), {"question": "   "}, format="json")
    assert response.status_code == 400


def test_chat_rejects_too_long_question(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    user, org = personal_user
    api_client.force_authenticate(user=user)
    response = api_client.post(chat_url(org.id), {"question": "a" * 1001}, format="json")
    assert response.status_code == 400


@pytest.mark.parametrize(
    "exc",
    [
        requests.exceptions.Timeout("timed out"),
        requests.exceptions.ConnectionError("unreachable"),
    ],
    ids=["timeout", "unreachable"],
)
def test_chat_returns_503_when_ai_request_fails(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
    exc: requests.exceptions.RequestException,
) -> None:
    user, org = personal_user
    api_client.force_authenticate(user=user)
    with mock.patch(
        "core.services.ai_chat.requests.post",
        side_effect=exc,
    ):
        response = api_client.post(chat_url(org.id), {"question": "hi"}, format="json")

    assert response.status_code == 503
    assert "unavailable" in response.data["errors"][0]


def test_chat_returns_503_when_ai_answers_with_error(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    user, org = personal_user
    api_client.force_authenticate(user=user)
    with mock.patch(
        "core.services.ai_chat.requests.post", return_value=FakeAiResponse(500, {"error": "boom"})
    ):
        response = api_client.post(chat_url(org.id), {"question": "hi"}, format="json")

    assert response.status_code == 503


@pytest.mark.parametrize(
    "payload",
    [
        None,  # not JSON
        {},  # missing keys
        {"answer": "", "metadata": {"intent": "x"}},  # empty answer
        {"answer": None, "metadata": {"intent": "x"}},  # null answer
        {"answer": 42, "metadata": {"intent": "x"}},  # non-string answer
        {"answer": "ok"},  # missing metadata
    ],
)
def test_chat_returns_503_on_invalid_ai_payload(
    api_client: APIClient,
    personal_user: tuple[User, Organization],
    payload: object | None,
) -> None:
    user, org = personal_user
    api_client.force_authenticate(user=user)
    with mock.patch(
        "core.services.ai_chat.requests.post", return_value=FakeAiResponse(200, payload)
    ):
        response = api_client.post(chat_url(org.id), {"question": "hi"}, format="json")

    assert response.status_code == 503


def test_chat_throttles_frequent_questions(
    api_client: APIClient, personal_user: tuple[User, Organization]
) -> None:
    user, org = personal_user
    api_client.force_authenticate(user=user)
    with (
        mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"ai_chat": "2/min"}),
        mock.patch("core.services.ai_chat.requests.post", return_value=ai_ok()),
    ):
        first = api_client.post(chat_url(org.id), {"question": "a"}, format="json")
        second = api_client.post(chat_url(org.id), {"question": "b"}, format="json")
        third = api_client.post(chat_url(org.id), {"question": "c"}, format="json")

    assert first.status_code == 200
    assert second.status_code == 200
    assert third.status_code == 429
