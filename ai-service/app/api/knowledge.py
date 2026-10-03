import logging
import time

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.services.embedding import EmbeddingService, get_embedding_service
from app.services.vector import VectorRepository

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/knowledge", tags=["Knowledge"])


class IngestRequest(BaseModel):
    document_id: str
    text: str
    metadata: dict = {}


def get_vector_repository() -> VectorRepository:
    return VectorRepository()


@router.post("/ingest")
async def ingest_document(
    payload: dict,
    embed_service: EmbeddingService = Depends(get_embedding_service),
    vector_repo: VectorRepository = Depends(get_vector_repository),
):
    start_total = time.perf_counter()

    # 1. Embedding measures timing
    start_embed = time.perf_counter()
    vector = await embed_service.generate_embedding(payload["text"])
    embed_time = time.perf_counter() - start_embed

    # 2. Saving time measure pgvector
    start_db = time.perf_counter()
    chunk_id = await vector_repo.save_chunk(
        document_id=payload.document_id,
        content=payload.text,
        embedding=vector,
        metadata=payload.metadata,
    )
    db_time = time.perf_counter() - start_db

    total_time = time.perf_counter() - start_total

    # Register all metrics into logs
    logger.info(
        f"Ingestion Metrics - Total: {total_time:.4f}s | "
        f"Gemini API: {embed_time:.4f}s | pgvector: {db_time:.4f}s"
    )

    return {
        "status": "success",
        "chunk_id": chunk_id,
        "message": "Text embedded and stored correctly.",
        "metrics": {
            "total_time_s": round(total_time, 4),
            "embedding_api_time_s": round(embed_time, 4),
            "database_time_s": round(db_time, 4),
        },
    }
