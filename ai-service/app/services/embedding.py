import os
from abc import ABC, abstractmethod

from fastapi import HTTPException


class EmbeddingProviderError(Exception):
    """Personalized exception per provider"""


# Base interface
class EmbeddingProvider(ABC):
    @abstractmethod
    async def generate_embedding(self, text: str) -> list[float]:
        pass


# Provider implementation
class GoogleEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str, model: str):
        self.model = model
        try:
            from google import genai
            from google.genai import errors

            self.genai_errors = errors
            self.client = genai.Client(api_key=api_key)
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="Install 'google-genai' to use this provider",
            )

    async def generate_embedding(self, text: str) -> list[float]:
        try:
            response = await self.client.aio.models.embed_content(
                model=self.model, contents=text
            )
            return response.embeddings.values
        except self.genai_errors.APIError as e:
            raise EmbeddingProviderError(f"Google API Error: {e.message}") from e


class OpenAICompatibleProvider(EmbeddingProvider):
    """Works para OpenAI, Nvidia y Jina AI"""

    def __init__(self, api_key: str, model: str, base_url: str | None = None):
        self.model = model
        try:
            import openai

            self.openai_errors = openai.OpenAIError
            self.client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
        except ImportError:
            raise HTTPException(
                status_code=500, detail="Install 'openai' to use this provider"
            )

    async def generate_embedding(self, text: str) -> list[float]:
        try:
            response = await self.client.embeddings.create(model=self.model, input=text)
            return response.data[0].embedding
        except self.openai_errors as e:
            raise EmbeddingProviderError(f"Embedding API Error: {e.message}") from e


class VoyageEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str, model: str):
        self.model = model
        try:
            import voyageai
            from voyageai.error import VoyageError

            self.voyage_error = VoyageError
            self.client = voyageai.AsyncClient(api_key=api_key)
        except ImportError:
            raise HTTPException(
                status_code=500, detail="Install 'voyageai' to use Voyage AI"
            )

    async def generate_embedding(self, text: str) -> list[float]:
        try:
            # Voyage received a list of texts and returns a list of embeddings
            response = await self.client.embed(texts=[text], model=self.model)
            return response.embeddings[0]
        except self.voyage_error as e:  # Captura específica de Voyage
            raise EmbeddingProviderError(f"Voyage API Error: {e.message}") from e


# Main service
class EmbeddingService:
    def __init__(self, provider: EmbeddingProvider):
        self.provider = provider

    async def generate_embedding(self, text: str) -> list[float]:
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="The text can't be empty")
        try:
            return await self.provider.generate_embedding(text)
        except EmbeddingProviderError as e:
            raise HTTPException(status_code=502, detail=f"API embedding error: {e!s}")


def get_embedding_service() -> EmbeddingService:
    base_url = os.getenv("EMBEDDING_BASE_URL")
    provider_name = os.getenv("EMBEDDING_PROVIDER", "").lower()
    api_key = os.getenv("EMBEDDING_API_KEY")
    model_name = os.getenv("EMBEDDING_MODEL")

    if not provider_name or not api_key or not model_name:
        raise HTTPException(
            status_code=500,
            detail="Missing embedding variable",
        )

    match provider_name:
        case "google":
            provider = GoogleEmbeddingProvider(api_key, model_name)
        case "openai":
            provider = OpenAICompatibleProvider(api_key, model_name)
        case "nvidia":
            provider = OpenAICompatibleProvider(api_key, model_name, base_url=base_url)
        case "jina":
            provider = OpenAICompatibleProvider(api_key, model_name, base_url=base_url)
        case "voyage":
            provider = VoyageEmbeddingProvider(api_key, model_name)
        case _:
            raise HTTPException(
                status_code=500, detail=f"Provider not supported: {provider_name}"
            )

    return EmbeddingService(provider)
