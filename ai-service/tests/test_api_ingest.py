from unittest.mock import AsyncMock

import asyncpg
from fastapi.testclient import TestClient

from app.clients.llm import LLMClientError
from app.dependencies import get_embedding_service
from app.main import app

client = TestClient(app)
BODY = {"document_id": "doc-123", "text": "Hello world"}


def test_ingest_endpoint() -> None:
    # Create a mock embedding service
    mock_service = AsyncMock()

    # Override the FastAPI dependency
    app.dependency_overrides[get_embedding_service] = lambda: mock_service

    response = client.post("/ingest/", json=BODY)

    assert response.status_code == 200
    assert response.json() == {"status": "success", "document_id": "doc-123"}
    mock_service.ingest_document.assert_awaited_once_with("doc-123", "Hello world")

    # Clean up overrides after test
    app.dependency_overrides.clear()


def test_ingest_embedding_failure_returns_503() -> None:
    mock_service = AsyncMock()
    mock_service.ingest_document.side_effect = LLMClientError("down")
    app.dependency_overrides[get_embedding_service] = lambda: mock_service

    response = client.post("/ingest/", json=BODY)

    assert response.status_code == 503
    assert response.json()["detail"] == "Embedding service temporarily unavailable"
    app.dependency_overrides.clear()


def test_ingest_database_failure_returns_500() -> None:
    mock_service = AsyncMock()
    mock_service.ingest_document.side_effect = asyncpg.PostgresError("db down")
    app.dependency_overrides[get_embedding_service] = lambda: mock_service

    response = client.post("/ingest/", json=BODY)

    assert response.status_code == 500
    assert response.json()["detail"] == "Vector store unavailable"
    app.dependency_overrides.clear()
