from datetime import UTC, datetime
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.clients.django import DjangoClientError
from app.main import app
from models.retrieval import CombinedRetrievalResult
from models.usage import LLMUsage

client = TestClient(app)
USAGE = LLMUsage(input_tokens=10, output_tokens=5)
BODY = {
    "user_id": 123,
    "organization_id": 1,
    "question": "How much did I spend this month?",
}
EMPTY = CombinedRetrievalResult(items=[])


def test_chat_endpoint_with_mock_rag():
    with patch("app.services.retrieval.Retriever.get_context") as mock_get_context:
        mock_get_context.return_value = EMPTY
        with patch("app.clients.llm.LLMClient.generate_response") as mock_llm:
            mock_llm.side_effect = [
                ("summary", USAGE),  # intent classification
                ("You spent €850 this month.", USAGE),  # final answer
            ]

            response = client.post("/api/v1/chat", json=BODY)

            assert response.status_code == 200
            assert "€850" in response.json()["answer"]
            assert response.json()["metadata"]["intent"] == "summary"


def test_unknown_intent_label_becomes_unsupported():
    with patch("app.services.retrieval.Retriever.get_context") as mock_get_context:
        mock_get_context.return_value = EMPTY
        with patch("app.clients.llm.LLMClient.generate_response") as mock_llm:
            mock_llm.side_effect = [
                ("something weird", USAGE),
                (
                    "I can't help with that, but I can help with your monthly totals.",
                    USAGE,
                ),
            ]

            response = client.post("/api/v1/chat", json=BODY)

            assert response.status_code == 200
            assert response.json()["metadata"]["intent"] == "unsupported"


def test_final_prompt_contains_current_date():
    d = datetime.now(UTC).astimezone().date()
    expected = f"{d:%A} {d.day} {d:%B %Y}"

    with patch("app.services.retrieval.Retriever.get_context") as mock_get_context:
        mock_get_context.return_value = EMPTY
        with patch("app.clients.llm.LLMClient.generate_response") as mock_llm:
            mock_llm.side_effect = [("summary", USAGE), ("Some answer", USAGE)]

            response = client.post("/api/v1/chat", json=BODY)

            assert response.status_code == 200
            final_prompt = mock_llm.call_args_list[1].args[0]  # 2nd call = final prompt
            assert expected in final_prompt
            assert "{{current_date}}" not in final_prompt


def test_forbidden_from_backend_returns_403():
    with patch("app.services.retrieval.Retriever.get_context") as mock_get_context:
        # side_effect with an exception: calling the mock raises it
        mock_get_context.side_effect = DjangoClientError("FORBIDDEN", "no", 403)

        with patch("app.clients.llm.LLMClient.generate_response") as mock_llm:
            mock_llm.side_effect = [
                ("summary", USAGE)
            ]  # only intent classification runs

            response = client.post("/api/v1/chat", json=BODY)

    assert response.status_code == 403
    assert response.json()["detail"] == "FORBIDDEN"
