import logging
from typing import Any

from app.clients.llm import LLMClient
from app.services.vector import VectorRepository

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, llm_client: LLMClient, db_pool: Any) -> None:
        self.llm_client = llm_client
        self.db_pool = db_pool
        self._repository = VectorRepository(db_pool)

    def chunk_text(
        self, text: str, chunk_size: int = 1000, overlap: int = 200
    ) -> list[str]:
        """Chunk the documents with a small overlapping."""
        chunks = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = start + chunk_size - overlap

        return chunks

    async def ingest_document(self, document_id: str, text: str) -> None:
        """Chunk the text, generate embeddings, and persist them to pgvector."""
        chunks = self.chunk_text(text)

        if not chunks:
            logger.warning("No text to process for document_id=%s", document_id)
            return

        # Generate embeddings through the LLM client.
        embeddings = await self.llm_client.generate_embeddings(chunks)

        await self._repository.save_chunks(
            document_id, list(zip(chunks, embeddings))
        )

        logger.info(
            "Successfully ingested document_id=%s with %s chunks",
            document_id,
            len(chunks),
        )
