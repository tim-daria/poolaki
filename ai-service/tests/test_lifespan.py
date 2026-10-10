from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI

from app.main import lifespan


@pytest.mark.asyncio
async def test_lifespan_initializes_and_closes_db():
    app = FastAPI()
    with (
        patch("app.main.init_db_pool", new_callable=AsyncMock) as mock_init,
        patch("app.main.close_db_pool", new_callable=AsyncMock) as mock_close,
    ):
        async with lifespan(app):
            mock_init.assert_awaited_once()
        mock_close.assert_awaited_once()
