from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

def test_chat_endpoint_with_mock_rag():
    # Simulates Django response/retriever
    mock_items = [{
        "type": "financial_summary",
        "content": "You spent €850 this month.",
        "source": "django_analytics",
        "metadata": {}
    }]
    
    with patch("app.services.retrieval.MockRetriever.get_context", return_value=mock_items):
        response = client.post(
            "/api/v1/chat",
            json={
                "user_id": "123",
                "organization_id": "org_1",
                "question": "How much did I spend this month?",
                "intent": "monthly_expenses"
            }
        )
        
        assert response.status_code == 200
        assert "€850" in response.json()["answer"]