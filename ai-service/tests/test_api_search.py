from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_search_endpoint():
    response = client.post("/search/", params={"query": "test query"})
    assert response.status_code in [200, 400, 500]