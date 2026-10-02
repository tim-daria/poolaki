from unittest.mock import AsyncMock, patch

import pytest

from app.db import close_db_pool, get_db_pool, init_db_pool


@pytest.mark.asyncio
async def test_init_db_pool():
  mock_pool = AsyncMock()
  with patch("asyncpg.create_pool", new_callable=AsyncMock) as mock_create:
    mock_create.return_value = mock_pool
    
    await init_db_pool("postgresql://test:test@localhost/test")
    
    mock_create.assert_awaited_once_with("postgresql://test:test@localhost/test")
    assert get_db_pool() == mock_pool


@pytest.mark.asyncio
async def test_close_db_pool():
  mock_pool = AsyncMock()
  with patch("app.db._db_pool", mock_pool):
    await close_db_pool()
    mock_pool.close.assert_awaited_once()