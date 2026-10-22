from fastapi import APIRouter, Depends
from pydantic import BaseModel

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
    await embedding_service.ingest_document(request.document_id, request.text)
    return {"status": "success", "document_id": request.document_id}
