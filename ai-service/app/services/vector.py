from typing import Any

import asyncpg


class VectorRepository:
    """Repository to manage vector persistence and search of chunks using pgvector."""

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    async def save_chunk(
        self,
        document_id: str,
        content: str,
        embedding: list[float],
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Saves a text chunk along with its vector embedding and optional metadata into the database."""
        query = """
            INSERT INTO chunks (document_id, content, embedding, metadata)
            VALUES ($1, $2, $3::vector, $4)
            RETURNING id;
        """
        # meta_value ensures an empty dictionary is used if no metadata is provided.
        meta_value = metadata if metadata is not None else {}
        # vector_str converts the list of floats (embedding) into a vector text format compatible with pgvector.
        vector_str = "[" + ",".join(map(str, embedding)) + "]"

        async with self._pool.acquire() as connection:
            chunk_id = await connection.fetchval(
                query, document_id, content, vector_str, meta_value
            )
            return str(chunk_id)

    async def query_similar_chunks(
        self,
        query_embedding: list[float],
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Searches for the most similar chunks to the query embedding using pgvector and returns a list with their similarity score."""
        # similarity measures how close the vectors are; higher values indicate greater semantic match.
        query = """
            SELECT id, document_id, content, metadata,
                   1 - (embedding <=> $1::vector) AS similarity
            FROM chunks
            ORDER BY embedding <=> $1::vector
            LIMIT $2;
        """
        vector_str = "[" + ",".join(map(str, query_embedding)) + "]"

        async with self._pool.acquire() as connection:
            rows = await connection.fetch(query, vector_str, limit)

            results = []
            for row in rows:
                results.append(
                    {
                        "id": str(row["id"]),
                        "document_id": row["document_id"],
                        "content": row["content"],
                        "metadata": row["metadata"],
                        "similarity": row["similarity"],
                    }
                )
            return results

    async def update_chunk(
        self,
        chunk_id: str,
        content: str | None = None,
        embedding: list[float] | None = None,
    ) -> bool:
        """Conditionally updates the text content or vector embedding of an existing chunk."""
        async with self._pool.acquire() as connection:
            if content is not None:
                await connection.execute(
                    "UPDATE chunks SET content = $1 WHERE id = $2;",
                    content,
                    chunk_id,
                )

            if embedding is not None:
                vector_str = "[" + ",".join(map(str, embedding)) + "]"
                await connection.execute(
                    "UPDATE chunks SET embedding = $1::vector WHERE id = $2; As a vector str ",
                    vector_str,
                    chunk_id,
                )

            return True
