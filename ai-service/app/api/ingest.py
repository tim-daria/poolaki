import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.clients.llm import LLMClientError
from app.dependencies import get_embedding_service
from app.services.embedding import EmbeddingService

router = APIRouter(prefix="/ingest", tags=["ingestion"])


class IngestRequest(BaseModel):
    document_id: str
    text: str


@router.post("/")
async def ingest_document(
    request: IngestRequest,
    embedding_service: EmbeddingService = Depends(get_embedding_service),
):
    # Trigger the chunking and embedding pipeline
    try:
        await embedding_service.ingest_document(request.document_id, request.text)
    except LLMClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding service temporarily unavailable",
        ) from exc
    except (asyncpg.PostgresError, asyncpg.InterfaceError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vector store unavailable",
        ) from exc
    return {"status": "success", "document_id": request.document_id}
