from unittest.mock import patch

from fastapi.testclient import TestClient

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


def test_chat_endpoint_with_mock_rag():
    with patch("app.services.retrieval.MockRetriever.get_context") as mock_get_context:
        mock_get_context.return_value = CombinedRetrievalResult(items=[])
        with patch("app.clients.llm.LLMClient.generate_response") as mock_llm:
            mock_llm.side_effect = [
                ("monthly_summary", USAGE),  # Intent classification
                ("You spent €850 this month.", USAGE),  # Final answer
            ]

            response = client.post("/api/v1/chat", json=BODY)

            assert response.status_code == 200
            assert "€850" in response.json()["answer"]
            assert response.json()["metadata"]["intent"] == "monthly_summary"


def test_unknown_intent_label_becomes_unsupported():
    with patch("app.clients.llm.LLMClient.generate_response") as mock_llm:
        mock_llm.side_effect = [
            ("something weird", USAGE),
            ("I can't help with that, but I can help with your monthly totals.", USAGE),
        ]

        response = client.post("/api/v1/chat", json=BODY)

        assert response.status_code == 200
        assert response.json()["metadata"]["intent"] == "unsupported"
