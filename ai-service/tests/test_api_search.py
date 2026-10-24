from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.dependencies import get_vector_search_service
from app.main import app

client = TestClient(app)


def test_search_endpoint() -> None:
    mock_service = AsyncMock()
    mock_service.search.return_value = [{"id": "chunk-1", "similarity": 0.9}]
    app.dependency_overrides[get_vector_search_service] = lambda: mock_service

    response = client.post("/search/", params={"query": "test query"})

    assert response.status_code == 200
    assert response.json() == [{"id": "chunk-1", "similarity": 0.9}]
    mock_service.search.assert_awaited_once_with("test query")

    app.dependency_overrides.clear()
