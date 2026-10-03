import os
from google import genai
from google.genai.errors import APIError
from fastapi import HTTPException


class EmbeddingService:
    """Service to generate text embeddings"""

    def __init__(self):
        api_key = os.getenv("EMBEDDING_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMBEDDING_API_KEY is not configured.")
        
        self.client = genai.Client(api_key=api_key)

        self.model_name = os.getenv("EMBEDDING_MODEL")

    async def generate_embedding(self, text: str) -> list[float]:
        """Generates a vector embedding for a given text chunk."""
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty for embedding generation.")

        try:
            # call embedding model
            response = self.client.models.embed_content(
                model=self.model_name,
                contents=text,
            )
            
            # Extract numeric values from the resulting vector
            if response.embedding and response.embedding.values:
                return list(response.embedding.values)
            
            raise HTTPException(status_code=500, detail="Provider returned an empty embedding response.")

        except APIError as e:
            # Specific errors API errors
            raise HTTPException(status_code=502, detail=f"Embedding API error: {e.message}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error generating embedding: {str(e)}")