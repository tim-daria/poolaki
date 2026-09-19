from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from models.retrieval import CombinedRetrievalResult

client = TestClient(app)


def test_chat_endpoint_with_mock_rag():
    with patch("app.services.retrieval.MockRetriever.get_context") as mock_get_context:
        mock_get_context.return_value = CombinedRetrievalResult(items=[])
        with patch("app.clients.llm.LLMClient.generate_response") as mock_llm:
            mock_llm.side_effect = [
                "monthly_summary",  # Intent classification
                "You spent €850 this month.",  # Final answer
            ]

            response = client.post(
                "/api/v1/chat",
                json={
                    "user_id": 123,
                    "organization_id": 1,
                    "question": "How much did I spend this month?",
                },
            )

            assert response.status_code == 200
            assert "€850" in response.json()["answer"]
