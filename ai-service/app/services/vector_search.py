import logging
import time
from typing import Any

import asyncpg

from app.config.settings import settings
from app.services.embedding import EmbeddingService
from app.services.vector import VectorRepository
from models.usage import TokenUsage

logger = logging.getLogger(__name__)


class VectorSearchService:
    def __init__(
        self, embedding_service: EmbeddingService, db_pool: asyncpg.Pool
    ) -> None:
        self.embedding_service = embedding_service
        self.db_pool = db_pool
        self._repository = VectorRepository(db_pool)

    async def search(
        self,
        query: str,
        limit: int = settings.vector_top_k,
        usage: TokenUsage | None = None,
    ) -> list[dict[str, Any]]:
        start_time = time.perf_counter()
        try:
            if not query or not query.strip():
                raise ValueError("Query cannot be empty")

            embeddings = await self.embedding_service.embed([query], usage=usage)
            results = await self._repository.query_similar_chunks(
                embeddings[0], limit=limit
            )

            logger.info(
                "vector_search_done",
                extra={
                    "duration_ms": round((time.perf_counter() - start_time) * 1000),
                    "query_chars": len(query),
                    "results": len(results),
                },
            )
            return results
        except Exception as exc:
            logger.error("Vector search failed: %s", exc)
            raise
