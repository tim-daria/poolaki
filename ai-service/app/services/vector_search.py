import time
import logging

logger = logging.getLogger(__name__)

class VectorSearchService:
    def __init__(self, db, embedding_client):
        self.db = db
        self.embedding_client = embedding_client

    async def search(self, query: str, limit: int = 5):
        start_time = time.time()
        try:
            if not query or not query.strip():
                raise ValueError("Query cannot be empty")
            
            embedding = await self.embedding_client.embed(query)
            tokens = len(query.split())
            results = await self.db.similarity_search(embedding, limit=limit)
            
            duration = time.time() - start_time
            logger.info(f"Vector search executed successfully in {duration:.4f}s with {tokens} tokens processed.")
            return results
        except Exception as e:
            logger.error(f"Vector search failed: {str(e)}")
            raise