
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.embeddings import EmbeddingService

def test_chunk_text_basic() -> None:
    # Test that text is correctly split into chunks with overlap
    service = EmbeddingService(llm_client=None, db_pool=None)
    sample_text = "A" * 1200
    chunks = service.chunk_text(sample_text, chunk_size=1000, overlap=200)
    
    assert len(chunks) == 2
    assert len(chunks[0]) == 1000
    assert len(chunks[1]) == 400

def test_chunk_text_small() -> None:
    service = EmbeddingService(llm_client=None, db_pool=None)
    sample_text = "Hola mundo"
    chunks = service.chunk_text(sample_text, chunk_size=1000, overlap=200)
    
    assert len(chunks) == 1
    assert chunks[0] == "Hola mundo"

@pytest.mark.asyncio
async def test_ingest_document_success() -> None:
    # Mock LLM client to return fake embeddings
    mock_llm = AsyncMock()
    mock_llm.generate_embeddings.return_value = [[0.1, 0.2, 0.3]]

    # Mock database connection and pool
    mock_conn = AsyncMock()
    mock_transaction = AsyncMock()
    mock_conn.transaction.return_value = mock_transaction
    
    mock_pool = MagicMock()
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn

    service = EmbeddingService(llm_client=mock_llm, db_pool=mock_pool)
    
    await service.ingest_document("doc-1", "Test content")

    # Verify LLM was called and database execution took place
    mock_llm.generate_embeddings.assert_awaited_once()
    mock_conn.execute.assert_awaited()
