"""FastAPI dependency providers shared by routers."""

from fastapi import Request

from app.config.settings import Settings
from app.db import get_db_pool
from app.services.context_builder import ContextBuilder
from app.services.embedding import EmbeddingService
from app.services.intention import IntentionService
from app.services.llm import LLMService
from app.services.prompt_builder import PromptBuilder
from app.services.retrieval import Retriever
from app.services.vector_search import VectorSearchService


def get_settings(request: Request) -> Settings:
    """Inject configuration settings into route handlers."""
    return request.app.state.settings


def get_embedding_service(request: Request) -> EmbeddingService:
    """Inject the EmbeddingService with its required dependencies."""
    return EmbeddingService(
        llm_client=request.app.state.llm_client,
        db_pool=get_db_pool(),
    )


def get_vector_search_service(request: Request) -> VectorSearchService:
    """Inject the VectorSearchService with embedding client and db pool."""
    return VectorSearchService(
        embedding_service=get_embedding_service(request),
        db_pool=get_db_pool(),
    )


def get_llm_service(request: Request) -> LLMService:
    """Build and inject the main LLMService instance."""
    llm_client = request.app.state.llm_client
    django_client = request.app.state.django_client

    retriever = Retriever(
        doc_repo=get_vector_search_service(request),
        django_client=django_client,
    )

    return LLMService(
        intention_service=IntentionService(llm_client),
        retriever=retriever,
        context_builder=ContextBuilder(),
        prompt_builder=PromptBuilder(),
        llm_client=llm_client,
    )
