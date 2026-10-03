from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import APIRouter, Depends
from fastapi.testclient import TestClient
from app.services.embedding import EmbeddingService, get_embedding_service

from app.main import app


client = TestClient(app)


@pytest.fixture
def mock_embedding_service():
    with patch("app.api.knowledge.EmbeddingService") as mock_service_class:
        mock_instance = mock_service_class.return_value
        mock_instance.generate_embedding = AsyncMock(return_value=[0.1, 0.2, 0.3])
        yield mock_instance


@pytest.fixture
def mock_vector_repo():
    with patch("app.api.knowledge.VectorRepository") as mock_repo_class:
        mock_instance = mock_repo_class.return_value
        # Mock saving with fake ID
        mock_instance.save_chunk = AsyncMock(return_value="mock-chunk-uuid-123")
        yield mock_instance


def test_ingest_knowledge_success(mock_embedding_service, mock_vector_repo):
    payload = {
        "document_id": "doc-test-456",
        "text": "Financial data chunk for testing embeddings.",
        "metadata": {"source": "unit-test"},
    }

    response = client.post("/knowledge/ingest", json=payload)

    # Endpoint validation
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["chunk_id"] == "mock-chunk-uuid-123"
    assert "metrics" in data
    assert "embedding_api_time_s" in data["metrics"]
    assert "database_time_s" in data["metrics"]