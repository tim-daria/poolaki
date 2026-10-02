import asyncpg
from typing import Optional

# Global variable to store the connection pool
_db_pool: Optional[asyncpg.Pool] = None


async def init_db_pool(database_url: str) -> None:
    """Initializes the global database connection pool."""
    global _db_pool
    _db_pool = await asyncpg.create_pool(database_url)


async def close_db_pool() -> None:
    """Closes the global database connection pool."""
    global _db_pool
    if _db_pool is not None:
        await _db_pool.close()
        _db_pool = None


def get_db_pool() -> asyncpg.Pool:
    """Returns the active database connection pool."""
    if _db_pool is None:
        raise RuntimeError("Database pool is not initialized.")
    return _db_pool