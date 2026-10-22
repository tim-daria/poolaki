"""Vector repository for querying document chunks from pgvector."""

import logging
from typing import Any

import asyncpg

logger = logging.getLogger(__name__)


class VectorRepository:
    """Handles database queries for vector similarity search."""

    def __init__(self, db_pool: asyncpg.Pool) -> None:
        self.db_pool = db_pool

    async def query_similar_chunks(
        self, query_embedding: list[float], limit: int = 5
    ) -> list[dict[str, Any]]:
        """Query similar document chunks using cosine distance operator."""
        query = """
            SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
            FROM document_chunks
            ORDER BY embedding <=> $1::vector
            LIMIT $2;
        """
        try:
            async with self.db_pool.acquire() as connection:
                rows = await connection.fetch(query, str(query_embedding), limit)
                return [
                    {
                        "id": str(row["id"]),
                        "content": row["content"],
                        "metadata": row["metadata"],
                        "similarity": float(row["similarity"]),
                    }
                    for row in rows
                ]
        except Exception as exc:
            logger.error("Failed to query similar chunks from database: %s", exc)
            raise