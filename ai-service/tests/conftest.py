import os

import pytest

os.environ.setdefault("LLM_BASE_URL", "http://test")
os.environ.setdefault("LLM_MODEL", "test")
os.environ.setdefault("LLM_API_KEY", "test")
os.environ.setdefault("EMBEDDING_MODEL", "test")
os.environ.setdefault("DJANGO_BASE_URL", "http://test")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("INTERNAL_API_TOKEN", "test-internal-token")


@pytest.fixture(autouse=True)
def app_state():
    """Populate lifespan-managed state for tests that bypass lifespan."""
    from app.clients.django import DjangoClient
    from app.clients.llm import LLMClient
    from app.main import app

    app.state.llm_client = LLMClient()
    app.state.django_client = DjangoClient()
    yield
