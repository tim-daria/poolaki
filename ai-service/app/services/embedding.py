import os
from abc import ABC, abstractmethod

from fastapi import HTTPException


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

            self.client = genai.Client(api_key=api_key)
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="Install 'google-genai' para usar Google Embeddings",
            )

    async def generate_embedding(self, text: str) -> list[float]:
        response = await self.client.aio.embeddings.create(
            model=self.model, inputs=[text]
        )
        return response.embeddings[0].values


class OpenAICompatibleProvider(EmbeddingProvider):
    """Works para OpenAI, Nvidia y Jina AI"""

    def __init__(self, api_key: str, model: str, base_url: str = None):
        self.model = model
        try:
            import openai

            self.client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
        except ImportError:
            raise HTTPException(
                status_code=500, detail="Install 'openai' to use this provider"
            )

    async def generate_embedding(self, text: str) -> list[float]:
        response = await self.client.embeddings.create(model=self.model, input=text)
        return response.data[0].embedding


class VoyageEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str, model: str):
        self.model = model
        try:
            import voyageai

            self.client = voyageai.AsyncClient(api_key=api_key)
        except ImportError:
            raise HTTPException(
                status_code=500, detail="Install 'voyageai' to use Voyage AI"
            )

    async def generate_embedding(self, text: str) -> list[float]:
        # Voyage received a list of texts and returns a list of embeddings
        response = await self.client.embed(texts=[text], model=self.model)
        return response.embeddings[0]


# Main service
class EmbeddingService:
    def __init__(self, provider: EmbeddingProvider):
        self.provider = provider

    async def generate_embedding(self, text: str) -> list[float]:
        if not text or not text.strip():
            raise HTTPException(
                status_code=400, detail="El texto para embedding no puede estar vacío."
            )
        try:
            return await self.provider.generate_embedding(text)
        except Exception as e:
            # Atrapa cualquier error de la API (timeout, token inválido, etc.)
            raise HTTPException(
                status_code=502, detail=f"Error en la API de embeddings: {e!s}"
            )


def get_embedding_service() -> EmbeddingService:
    base_url = os.getenv("EMBEDDING_BASE_URL")
    provider_name = os.getenv("EMBEDDING_PROVIDER", "").lower()
    api_key = os.getenv("EMBEDDING_API_KEY")
    model_name = os.getenv("EMBEDDING_MODEL")

    if not provider_name or not api_key or not model_name:
        raise HTTPException(
            status_code=500,
            detail="Faltan variables en .env: EMBEDDING_PROVIDER, EMBEDDING_API_KEY o EMBEDDING_MODEL",
        )

    match provider_name:
        case "google":
            provider = GoogleEmbeddingProvider(api_key, model_name)
        case "openai":
            provider = OpenAICompatibleProvider(api_key, model_name)
        case "nvidia":
            provider = OpenAICompatibleProvider(
                api_key, model_name, base_url="https://integrate.api.nvidia.com/v1"
            )
        case "jina":
            provider = OpenAICompatibleProvider(
                api_key, model_name, base_url="https://api.jina.ai/v1"
            )
        case "voyage":
            provider = VoyageEmbeddingProvider(api_key, model_name)
        case _:
            raise HTTPException(
                status_code=500, detail=f"Proveedor no soportado: {provider_name}"
            )

    return EmbeddingService(provider)
