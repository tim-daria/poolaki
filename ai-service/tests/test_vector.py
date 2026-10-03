from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from app.services.vector import VectorRepository


@pytest.mark.asyncio
async def test_save_chunk_success():
    mock_pool = MagicMock()
    mock_conn = AsyncMock()
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn
    mock_conn.fetchval.return_value = "123e4567-e89b-12d3-a456-426614174000"

    repo = VectorRepository(mock_pool)
    result = await repo.save_chunk("doc-1", "Hello world", [0.1, 0.2, 0.3])

    assert result == "123e4567-e89b-12d3-a456-426614174000"
    mock_conn.fetchval.assert_awaited_once()


@pytest.mark.asyncio
async def test_save_chunk_empty_content_raises_error():
    mock_pool = MagicMock()
    repo = VectorRepository(mock_pool)

    with pytest.raises(HTTPException) as exc_info:
        await repo.save_chunk("doc-1", "   ", [0.1, 0.2])

    assert exc_info.value.status_code == 400
