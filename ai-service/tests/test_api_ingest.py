from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from app.main import app, get_embedding_service

client = TestClient(app)

def test_ingest_endpoint() -> None:
    # Create a mock embedding service
    mock_service = AsyncMock()
    
    # Override the FastAPI dependency
    app.dependency_overrides[get_embedding_service] = lambda: mock_service

    response = client.post(
        "/ingest/",
        json={"document_id": "doc-123", "text": "Hello world"}
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success", "document_id": "doc-123"}
    mock_service.ingest_document.assert_awaited_once_with("doc-123", "Hello world")

    # Clean up overrides after test
    app.dependency_overrides.clear()