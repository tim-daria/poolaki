import logging
from typing import Any

from app.clients.llm import LLMClient

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self, llm_client: LLMClient, db_pool: Any) -> None:
        self.llm_client = llm_client
        self.db_pool = db_pool

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
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
        """Orquesta la división de texto, la generación de embeddings y el guardado en pgvector."""
        chunks = self.chunk_text(text)
        
        if not chunks:
            logger.warning("No text to process for document_id=%s", document_id)
            return

        # Llama al nuevo método del cliente LLM
        embeddings = await self.llm_client.generate_embeddings(chunks)

        # Save into the db
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                for idx in range(len(chunks)):
                    chunk_text = chunks[idx]
                    vector = embeddings[idx]
                    
                    # pgvector accepts the representation in str of a py list
                    await conn.execute(
                        """
                        INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
                        VALUES ($1, $2, $3, $4)
                        """,
                        document_id,
                        idx,
                        chunk_text,
                        str(vector)
                    )
        
        logger.info("Successfully ingested document_id=%s with %s chunks", document_id, len(chunks))