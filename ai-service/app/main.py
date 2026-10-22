from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request

from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.clients.django import DjangoClient
from app.clients.llm import LLMClient
from app.config.settings import Settings
from app.config.logging import configure_logging
from app.config.settings import settings
from app.db import _db_pool, close_db_pool, init_db_pool
from app.services.context_builder import ContextBuilder
from app.services.embedding import EmbeddingService
from app.services.intention import IntentionService
from app.services.llm import LLMService
from app.services.prompt_builder import PromptBuilder
from app.services.retrieval import MockDocumentRepository, Retriever

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize settings locally to avoid global variables
    app_settings = settings()
    app.state.settings = app_settings

    await init_db_pool(settings.database_url)

    # Initialize persistent clients and attach them to app state
    app.state.django_client = DjangoClient()
    app.state.llm_client = LLMClient(settings=app_settings)

    yield

    # Graceful shutdown of persistent connections
    await app.state.django_client.close()
    await close_db_pool()


def get_settings(request: Request) -> Settings:
    """Inject configuration settings into route handlers."""
    return request.app.state.settings


def get_embedding_service(request: Request) -> EmbeddingService:
    """Inject the EmbeddingService with its required dependencies."""
    return EmbeddingService(
        llm_client=request.app.state.llm_client,
        db_pool=_db_pool
    )


def get_llm_service(request: Request) -> LLMService:
    """Build and inject the main LLMService instance."""
    llm_client = request.app.state.llm_client
    django_client = request.app.state.django_client
    
    document_repository = MockDocumentRepository()
    retriever = Retriever(
        doc_repo=document_repository,
        django_client=django_client,
    )

    llm_service = LLMService(
        intention_service=IntentionService(llm_client),
        retriever=retriever,
        context_builder=ContextBuilder(),
        prompt_builder=PromptBuilder(),
        llm_client=llm_client,
    )

app = FastAPI(title="Poolaki AI Service", version="0.1.0", lifespan=lifespan)


app.include_router(health_router)
app.include_router(chat_router)
